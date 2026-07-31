// ---------------------------------------------------------------------------
// Sub-resource detection, naming, and hydration code generation.
// ---------------------------------------------------------------------------

import type {
  OperationInfo,
  ResourceGroup,
  SubResourceGroup,
  NestedSubResourceGroup,
} from './types.js';
import {
  tagToIdField,
  classToEntityName,
  formatJsDocDescription,
} from './naming.js';
import { isPaginated, hasEntriesInResponse } from './parse-spec.js';

// ---------------------------------------------------------------------------
// Sub-resource qualifier extraction and naming
// ---------------------------------------------------------------------------

/** Extract the sub-resource qualifier from a method name by stripping the verb prefix. */
export function extractSubResourceQualifier(methodName: string): string {
  let qualifier = methodName;
  for (const verb of [
    'list',
    'get',
    'create',
    'update',
    'delete',
    'remove',
    'add',
    'assign',
    'set',
    'post',
    'materialize',
    'activate',
    'deactivate',
    'sync',
    'test',
    'lookup',
    'export',
    'send',
    'share',
    'copy',
    'save',
    'source',
    'untag',
    'tag',
  ]) {
    if (
      methodName.startsWith(verb) &&
      methodName.length > verb.length &&
      /[A-Z]/.test(methodName[verb.length])
    ) {
      qualifier =
        methodName[verb.length].toLowerCase() +
        methodName.slice(verb.length + 1);
      break;
    }
  }
  return qualifier;
}

/** Pluralize a qualifier for use as an accessor name. */
export function pluralizeAccessor(name: string): string {
  if (name.endsWith('s') || name.endsWith('History') || name.endsWith('Swap')) {
    return name;
  }
  // Handle words ending in 'y' preceded by a consonant: "query" -> "queries"
  if (
    name.endsWith('y') &&
    name.length > 1 &&
    !/[aeiou]/.test(name[name.length - 2])
  ) {
    return name.slice(0, -1) + 'ies';
  }
  return name + 's';
}

/**
 * Derive a short method name for use inside a sub-resource accessor.
 * Strips the sub-resource qualifier from the method name.
 * e.g. "listTeams" with accessor "teams" -> "list"
 *      "getBookmark" with accessor "bookmarks" -> "get"
 *      "listAccessibleInodes" with accessor "accessibleInodes" -> "list"
 *      "assignUserAttributesTo" with accessor "userAttributesTos" -> keeps original
 */
export function deriveAccessorMethodName(
  methodName: string,
  accessorName: string,
): string {
  // Capitalize accessor for matching: "teams" -> "Teams", "accessibleInodes" -> "AccessibleInodes"
  const capitalAccessor =
    accessorName.charAt(0).toUpperCase() + accessorName.slice(1);
  // Also try singular: "Teams" -> "Team", "Bookmarks" -> "Bookmark"
  const singularAccessor = capitalAccessor.endsWith('s')
    ? capitalAccessor.slice(0, -1)
    : capitalAccessor;

  // Try to strip the qualifier from the method name
  for (const suffix of [capitalAccessor, singularAccessor]) {
    // Check if method name ends with the suffix (e.g. "listTeams" ends with "Teams")
    if (methodName.endsWith(suffix)) {
      const verb = methodName.slice(0, -suffix.length);
      if (verb.length > 0) return verb;
    }
    // Check if method contains the suffix in the middle (e.g. "listTeamAssignments")
    const idx = methodName.indexOf(suffix);
    if (idx > 0) {
      const verb = methodName.slice(0, idx);
      const rest = methodName.slice(idx + suffix.length);
      if (verb.length > 0) {
        if (rest.length === 0) return verb;
        // e.g. "listElementColumns" -> "list" (when accessor is "elementColumns")
        return verb;
      }
    }
  }

  return methodName;
}

/**
 * Derive a short method name for a nested sub-resource accessor.
 * Strips both the parent entity and the nested accessor qualifier.
 * e.g. "listElementColumns" with parent "element", accessor "columns" -> "list"
 *      "getElementQuery" with parent "element", accessor "querys" -> "get"
 */
export function deriveNestedAccessorMethodName(
  methodName: string,
  parentEntity: string,
  accessorName: string,
): string {
  // First, try to strip the full compound qualifier (e.g. "ElementColumns" from "listElementColumns")
  const parentCapital =
    parentEntity.charAt(0).toUpperCase() + parentEntity.slice(1);
  const accessorCapital =
    accessorName.charAt(0).toUpperCase() + accessorName.slice(1);
  const singularAccessor = accessorCapital.endsWith('s')
    ? accessorCapital.slice(0, -1)
    : accessorCapital;

  for (const compound of [
    parentCapital + accessorCapital,
    parentCapital + singularAccessor,
  ]) {
    if (methodName.includes(compound)) {
      const idx = methodName.indexOf(compound);
      const verb = methodName.slice(0, idx);
      if (verb.length > 0) return verb;
    }
  }

  // Fall back to the regular derivation
  return deriveAccessorMethodName(methodName, accessorName);
}

// ---------------------------------------------------------------------------
// Sub-resource group detection
// ---------------------------------------------------------------------------

/**
 * Collect all top-level property names from a schema object.
 * Recursively resolves `allOf`, `oneOf`, and `anyOf` to be conservative
 * (flags anything that could collide in any variant).
 *
 * @param schema - The schema to inspect
 * @param resolveRef - Optional function to resolve `$ref` strings
 * @param depth - Recursion guard
 */
function collectSchemaProperties(
  schema: import('./types.js').SchemaObject,
  resolveRef?: (ref: string) => import('./types.js').SchemaObject | null,
  depth = 0,
): Set<string> {
  if (depth > 5) return new Set();
  const props = new Set<string>();

  if (schema.$ref) {
    const resolved = resolveRef?.(schema.$ref);
    if (resolved) {
      for (const p of collectSchemaProperties(resolved, resolveRef, depth + 1))
        props.add(p);
    }
    return props;
  }

  if (schema.properties) {
    for (const k of Object.keys(schema.properties)) props.add(k);
  }

  for (const s of schema.allOf ?? []) {
    for (const p of collectSchemaProperties(s, resolveRef, depth + 1))
      props.add(p);
  }

  for (const s of [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) {
    for (const p of collectSchemaProperties(s, resolveRef, depth + 1))
      props.add(p);
  }

  return props;
}

/**
 * Collect all property names that appear in the primary entity's response
 * schemas (get, create, update operations on the resource itself).
 * These names must not be used as sub-resource accessor names because the
 * hydration function uses `Object.assign` and would overwrite them.
 */
function collectPrimaryEntityResponseProperties(
  group: ResourceGroup,
): Set<string> {
  const corePrimaryMethods = new Set(['get', 'create', 'update']);
  const result = new Set<string>();

  for (const op of group.operations) {
    const baseName = op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '');
    if (!corePrimaryMethods.has(baseName)) continue;
    // Only single-entity ops (at most one path param — the primary ID)
    if (op.pathParams.length > 1) continue;
    if (!op.responseSchema) continue;

    for (const p of collectSchemaProperties(op.responseSchema)) result.add(p);
  }

  // Also check list entry schemas so that hydrated list entries don't collide
  for (const op of group.operations) {
    const baseName = op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '');
    if (baseName !== 'list') continue;
    if (!op.responseSchema) continue;

    // Find the entries item schema
    function findEntriesItemSchema(
      schema: import('./types.js').SchemaObject,
      depth = 0,
    ): import('./types.js').SchemaObject | null {
      if (depth > 5 || !schema) return null;
      if (schema.properties?.entries?.items)
        return schema.properties.entries.items;
      for (const s of schema.allOf ?? []) {
        const found = findEntriesItemSchema(s, depth + 1);
        if (found) return found;
      }
      return null;
    }

    const itemSchema = findEntriesItemSchema(op.responseSchema);
    if (itemSchema) {
      for (const p of collectSchemaProperties(itemSchema)) result.add(p);
    }
  }

  return result;
}

/**
 * Rename an accessor name to avoid colliding with an existing response property.
 * Appends "Resource" to the name (e.g. "tags" -> "tagsResource").
 */
function safeAccessorName(name: string, reserved: Set<string>): string {
  if (!reserved.has(name)) return name;
  return name + 'Resource';
}

/**
 * Detect sub-resource method groups for a resource.
 *
 * A "sub-resource method" is any method whose first path parameter matches
 * the resource's primary ID field (e.g. `workbookId` for WorkbooksResource)
 * AND has additional path params or a different sub-resource qualifier in
 * the method name (e.g. `listBookmarks`, `getBookmark`).
 *
 * Core CRUD methods (`list`, `get`, `create`, `update`, `delete`, `patch`)
 * that only take the primary ID are excluded.
 *
 * Accessor names that would collide with existing response properties are
 * automatically renamed (e.g. "tags" -> "tagsResource") to prevent
 * `Object.assign` from overwriting API response data during hydration.
 */
export function detectSubResourceGroups(group: ResourceGroup): {
  groups: SubResourceGroup[];
  flatOps: (OperationInfo & { methodName: string; typePrefix: string })[];
} {
  const primaryIdField = tagToIdField(group.tag);

  // Core method names that operate on the resource itself, not sub-resources
  const coreMethods = new Set([
    'list',
    'get',
    'create',
    'update',
    'delete',
    'patch',
  ]);

  // Find all sub-resource methods: methods whose first path param is the
  // primary ID and whose name indicates a sub-resource (not a core CRUD op
  // on the resource itself).
  const subResourceOps: (OperationInfo & {
    methodName: string;
    typePrefix: string;
  })[] = [];
  for (const op of group.operations) {
    if (op.pathParams.length === 0) continue;
    if (op.pathParams[0].name !== primaryIdField) continue;
    // Skip core CRUD methods (they operate on the resource itself)
    const baseName = op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '');
    if (coreMethods.has(baseName)) continue;
    subResourceOps.push(op);
  }

  // Separate level-1 (1 path param) and level-2+ (2+ path params) methods
  const level1Ops: (OperationInfo & {
    methodName: string;
    typePrefix: string;
  })[] = [];
  const level2Ops: (OperationInfo & {
    methodName: string;
    typePrefix: string;
  })[] = [];
  for (const op of subResourceOps) {
    if (op.pathParams.length === 1) {
      level1Ops.push(op);
    } else if (op.pathParams.length >= 2) {
      level2Ops.push(op);
    }
  }

  // Group level-1 methods by accessor name
  const groupsMap = new Map<
    string,
    (OperationInfo & { methodName: string; typePrefix: string })[]
  >();
  for (const op of level1Ops) {
    const qualifier = extractSubResourceQualifier(op.methodName);
    const accessorName = pluralizeAccessor(qualifier);
    if (!groupsMap.has(accessorName)) {
      groupsMap.set(accessorName, []);
    }
    groupsMap.get(accessorName)!.push(op);
  }

  // Group level-2 methods by their second path param, then try to nest them
  // under the appropriate level-1 group.
  // e.g. listElementColumns(workbookId, elementId) -> nested under "elements"
  const nestedBySecondParam = new Map<
    string,
    (OperationInfo & { methodName: string; typePrefix: string })[]
  >();
  for (const op of level2Ops) {
    const secondParam = op.pathParams[1].name;
    if (!nestedBySecondParam.has(secondParam)) {
      nestedBySecondParam.set(secondParam, []);
    }
    nestedBySecondParam.get(secondParam)!.push(op);
  }

  // Build nested sub-resource groups
  // For each second param (e.g. "elementId"), find the level-1 group that
  // matches (e.g. "elements") and attach nested groups
  const nestedGroups = new Map<string, NestedSubResourceGroup[]>();
  const assignedLevel2Ops = new Set<OperationInfo>();

  for (const [secondParam, ops] of nestedBySecondParam) {
    // Derive the parent accessor name from the second param
    // e.g. "elementId" -> "elements", "pageId" -> "pages"
    const parentEntity = secondParam.replace(/Id$/, '');
    const parentAccessor = pluralizeAccessor(parentEntity);

    // Check if a level-1 group exists for this parent
    if (groupsMap.has(parentAccessor)) {
      // Group the nested ops by their own sub-resource qualifier
      const nestedOpsMap = new Map<
        string,
        (OperationInfo & { methodName: string; typePrefix: string })[]
      >();
      for (const op of ops) {
        const qualifier = extractSubResourceQualifier(op.methodName);
        // Strip the parent entity prefix from the qualifier
        // e.g. "elementColumns" with parent "element" -> "columns"
        const parentCapital =
          parentEntity.charAt(0).toUpperCase() + parentEntity.slice(1);
        let nestedQualifier = qualifier;
        if (qualifier.startsWith(parentEntity)) {
          nestedQualifier = qualifier.slice(parentEntity.length);
          nestedQualifier =
            nestedQualifier.charAt(0).toLowerCase() + nestedQualifier.slice(1);
        } else if (qualifier.startsWith(parentCapital)) {
          nestedQualifier = qualifier.slice(parentCapital.length);
          nestedQualifier =
            nestedQualifier.charAt(0).toLowerCase() + nestedQualifier.slice(1);
        }
        const nestedAccessor = pluralizeAccessor(nestedQualifier || qualifier);

        if (!nestedOpsMap.has(nestedAccessor)) {
          nestedOpsMap.set(nestedAccessor, []);
        }
        nestedOpsMap.get(nestedAccessor)!.push(op);
        assignedLevel2Ops.add(op);
      }

      const nested: NestedSubResourceGroup[] = [];
      for (const [nestedAccessor, nestedMethods] of nestedOpsMap) {
        nested.push({
          accessorName: nestedAccessor,
          nestedIdParam: secondParam,
          methods: nestedMethods,
        });
      }
      if (!nestedGroups.has(parentAccessor)) {
        nestedGroups.set(parentAccessor, []);
      }
      nestedGroups.get(parentAccessor)!.push(...nested);
    }
  }

  // Any level-2 ops not assigned to a nested group get added as flat level-1
  for (const op of level2Ops) {
    if (!assignedLevel2Ops.has(op)) {
      const qualifier = extractSubResourceQualifier(op.methodName);
      const accessorName = pluralizeAccessor(qualifier);
      if (!groupsMap.has(accessorName)) {
        groupsMap.set(accessorName, []);
      }
      groupsMap.get(accessorName)!.push(op);
    }
  }

  // Collect response property names from the primary entity (get/create/update/list
  // entries) so we can detect accessor name collisions before emitting code.
  // `Object.assign(entry, accessors)` would silently overwrite any response field
  // that shares a name with a sub-resource accessor.
  const reservedProps = collectPrimaryEntityResponseProperties(group);

  const result: SubResourceGroup[] = [];
  const flatOps: (OperationInfo & {
    methodName: string;
    typePrefix: string;
  })[] = [];

  for (const [rawAccessorName, methods] of groupsMap) {
    // Only include sub-resource groups that have a "list" method (collections)
    const hasList = methods.some(
      (op) =>
        deriveAccessorMethodName(op.methodName, rawAccessorName) === 'list',
    );
    if (!hasList) {
      // Non-collection methods become flat accessors on the hydrated entry
      flatOps.push(...methods);
      continue;
    }

    // Rename the accessor if it collides with a response property
    const accessorName = safeAccessorName(rawAccessorName, reservedProps);

    // Also filter nested groups to only keep collections
    let nested = nestedGroups.get(rawAccessorName);
    if (nested) {
      const parentEntity = rawAccessorName.endsWith('s')
        ? rawAccessorName.slice(0, -1)
        : rawAccessorName;
      nested = nested.filter((n) =>
        n.methods.some(
          (op) =>
            deriveNestedAccessorMethodName(
              op.methodName,
              parentEntity,
              n.accessorName,
            ) === 'list',
        ),
      );
      if (nested.length === 0) nested = undefined;
    }

    result.push({
      accessorName,
      originalAccessorName: rawAccessorName,
      parentIdParam: primaryIdField,
      methods,
      nested: nested?.sort((a, b) =>
        a.accessorName.localeCompare(b.accessorName),
      ),
    });
  }

  return {
    groups: result.sort((a, b) => a.accessorName.localeCompare(b.accessorName)),
    flatOps,
  };
}

// ---------------------------------------------------------------------------
// Hydration code generation
// ---------------------------------------------------------------------------

/**
 * Build full JSDoc lines for a sub-resource interface method.
 * Mirrors the JSDoc produced by `generateMethodSignature` for top-level
 * resource methods: summary, description, @param, @returns, @see.
 *
 * @param op - The operation info
 * @param indent - Whitespace prefix for each line (e.g. "    " for nested)
 * @param skipPathParams - How many leading path params are curried away (1 for
 *   collection/flat methods, 2 for nested sub-resource methods)
 * @param allVariant - If true, emit "(auto-paginate all pages)" suffix and
 *   use @yields instead of @returns
 */
function buildSubResourceJsDoc(
  op: OperationInfo & { methodName: string; typePrefix: string },
  indent: string,
  skipPathParams: number,
  allVariant = false,
): string[] {
  const lines: string[] = [];
  const responseTypeName = op.hasResponse ? op.typePrefix + 'Response' : null;
  const queryName = op.queryParams.length > 0 ? op.typePrefix + 'Query' : null;
  const bodyName =
    op.hasBody && op.bodyContentType && op.bodySchema
      ? op.typePrefix + 'Body'
      : null;

  lines.push(`${indent}/**`);

  // Summary
  if (op.summary) {
    const suffix = allVariant ? ' (auto-paginate all pages)' : '';
    lines.push(`${indent} * ${op.summary}${suffix}`);
  }

  lines.push(
    `${indent} *`,
    `${indent} * Source docs: https://help.sigmacomputing.com/reference/${op.operationId.toLowerCase()}`,
  );

  // Description
  if (op.description) {
    lines.push(`${indent} *`);
    lines.push(...formatJsDocDescription(op.description, indent));
  }

  // @param tags (only for params that are NOT curried away)
  const paramDocs: string[] = [];
  if (!allVariant) {
    for (let i = skipPathParams; i < op.pathParams.length; i++) {
      const p = op.pathParams[i];
      const desc = p.schema?.description ?? p.description;
      if (desc) {
        paramDocs.push(`${indent} * @param ${p.name} - ${desc}`);
      } else {
        paramDocs.push(`${indent} * @param ${p.name}`);
      }
    }
    if (bodyName) {
      const desc = op.bodyDescription || 'The request body.';
      paramDocs.push(`${indent} * @param body - ${desc}`);
    }
  } else {
    // *All variants still document remaining path params
    for (let i = skipPathParams; i < op.pathParams.length; i++) {
      const p = op.pathParams[i];
      const desc = p.schema?.description ?? p.description;
      if (desc) {
        paramDocs.push(`${indent} * @param ${p.name} - ${desc}`);
      } else {
        paramDocs.push(`${indent} * @param ${p.name}`);
      }
    }
  }
  if (queryName) {
    paramDocs.push(`${indent} * @param query - Query parameters`);
  }
  if (paramDocs.length > 0) {
    lines.push(`${indent} *`);
    lines.push(...paramDocs);
  }

  // @returns / @yields
  if (responseTypeName) {
    if (allVariant) {
      lines.push(`${indent} * @yields ${responseTypeName}`);
    } else {
      lines.push(`${indent} * @returns ${responseTypeName}`);
    }
  }

  lines.push(`${indent} */`);
  return lines;
}

/**
 * Generate the sub-resource accessor interface, hydrated entry type, and
 * hydration function for a resource group.
 * Returns null if the resource has no sub-resource methods.
 */
export function generateSubResourceCode(
  group: ResourceGroup,
  subGroups: SubResourceGroup[],
  flatOps: (OperationInfo & { methodName: string; typePrefix: string })[] = [],
): {
  accessorInterface: string;
  hydrateFunction: string;
  entityName: string;
} | null {
  if (subGroups.length === 0 && flatOps.length === 0) return null;

  const className = group.className;
  const entityName = classToEntityName(className);
  const accessorTypeName = `${entityName}SubResources`;
  const hydratedTypeName = `Hydrated${entityName}`;
  const hydrateFnName = `_hydrate${entityName}`;
  const primaryIdField =
    subGroups.length > 0 ? subGroups[0].parentIdParam : tagToIdField(group.tag);

  // --- Accessor interface ---
  const ifaceLines: string[] = [];
  ifaceLines.push(
    `/** Sub-resource accessors available on hydrated ${entityName.toLowerCase()} entries. */`,
  );
  ifaceLines.push(`export interface ${accessorTypeName} {`);

  for (const sub of subGroups) {
    ifaceLines.push(`  ${sub.accessorName}: {`);
    for (const op of sub.methods) {
      const shortName = deriveAccessorMethodName(
        op.methodName,
        sub.originalAccessorName,
      );
      const responseTypeName = op.hasResponse
        ? op.typePrefix + 'Response'
        : 'void';
      const queryName =
        op.queryParams.length > 0 ? op.typePrefix + 'Query' : null;
      const bodyName =
        op.hasBody && op.bodyContentType && op.bodySchema
          ? op.typePrefix + 'Body'
          : null;

      // Curried params: drop the first path param (parent ID)
      const params: string[] = [];
      for (let i = 1; i < op.pathParams.length; i++) {
        params.push(`${op.pathParams[i].name}: string`);
      }
      if (bodyName) params.push(`body: ${bodyName}`);
      if (queryName) params.push(`query?: ${queryName}`);

      const ret = op.hasResponse
        ? `Promise<DeepReadonly<${responseTypeName}>>`
        : 'Promise<void>';
      ifaceLines.push(...buildSubResourceJsDoc(op, '    ', 1));
      ifaceLines.push(`    ${shortName}(${params.join(', ')}): ${ret};`);

      // *All variant for paginated methods
      if (isPaginated(op)) {
        const allParams: string[] = [];
        for (let i = 1; i < op.pathParams.length; i++) {
          allParams.push(`${op.pathParams[i].name}: string`);
        }
        if (queryName) allParams.push(`query?: ${queryName}`);
        ifaceLines.push(...buildSubResourceJsDoc(op, '    ', 1, true));
        ifaceLines.push(
          `    ${shortName}All(${allParams.join(', ')}): PaginatedAsyncGenerator<DeepReadonly<${responseTypeName}>>;`,
        );
      }
    }
    ifaceLines.push(`  };`);
  }

  // Flat methods (non-collection operations accessible directly on the entry)
  for (const op of flatOps) {
    const responseTypeName = op.hasResponse
      ? op.typePrefix + 'Response'
      : 'void';
    const queryName =
      op.queryParams.length > 0 ? op.typePrefix + 'Query' : null;
    const bodyName =
      op.hasBody && op.bodyContentType && op.bodySchema
        ? op.typePrefix + 'Body'
        : null;

    // Curried params: drop the first path param (parent ID)
    const params: string[] = [];
    for (let i = 1; i < op.pathParams.length; i++) {
      params.push(`${op.pathParams[i].name}: string`);
    }
    if (bodyName) params.push(`body: ${bodyName}`);
    if (queryName) params.push(`query?: ${queryName}`);

    const ret = op.hasResponse
      ? `Promise<DeepReadonly<${responseTypeName}>>`
      : 'Promise<void>';
    ifaceLines.push(...buildSubResourceJsDoc(op, '  ', 1));
    ifaceLines.push(`  ${op.methodName}(${params.join(', ')}): ${ret};`);
  }

  ifaceLines.push(`}`);

  // --- Nested sub-resource interfaces ---
  // For sub-resource groups with nested children, generate a nested accessor interface
  // Only generate if the parent sub-resource has a list method that returns entries
  for (const sub of subGroups) {
    if (!sub.nested || sub.nested.length === 0) continue;
    const hasListWithEntries = sub.methods.some((op) => {
      const shortName = deriveAccessorMethodName(
        op.methodName,
        sub.originalAccessorName,
      );
      return shortName === 'list' && hasEntriesInResponse(op);
    });
    if (!hasListWithEntries) continue;
    const nestedEntity = sub.originalAccessorName.endsWith('s')
      ? sub.originalAccessorName.charAt(0).toUpperCase() +
        sub.originalAccessorName.slice(1, -1)
      : sub.originalAccessorName.charAt(0).toUpperCase() +
        sub.originalAccessorName.slice(1);
    const nestedTypeName = `${entityName}${nestedEntity}SubResources`;
    ifaceLines.push('');
    ifaceLines.push(
      `/** Sub-resource accessors available on hydrated ${nestedEntity.toLowerCase()} entries (nested under ${entityName.toLowerCase()}). */`,
    );
    ifaceLines.push(`export interface ${nestedTypeName} {`);
    // Derive the parent entity name for nested method name derivation
    const parentEntityForNested = sub.originalAccessorName.endsWith('s')
      ? sub.originalAccessorName.slice(0, -1)
      : sub.originalAccessorName;

    for (const nested of sub.nested) {
      ifaceLines.push(`  ${nested.accessorName}: {`);
      for (const op of nested.methods) {
        const shortName = deriveNestedAccessorMethodName(
          op.methodName,
          parentEntityForNested,
          nested.accessorName,
        );
        const responseTypeName = op.hasResponse
          ? op.typePrefix + 'Response'
          : 'void';
        const queryName =
          op.queryParams.length > 0 ? op.typePrefix + 'Query' : null;
        const bodyName =
          op.hasBody && op.bodyContentType && op.bodySchema
            ? op.typePrefix + 'Body'
            : null;

        // Curried params: drop the first 2 path params (parent + nested ID)
        const params: string[] = [];
        for (let i = 2; i < op.pathParams.length; i++) {
          params.push(`${op.pathParams[i].name}: string`);
        }
        if (bodyName) params.push(`body: ${bodyName}`);
        if (queryName) params.push(`query?: ${queryName}`);

        const ret = op.hasResponse
          ? `Promise<DeepReadonly<${responseTypeName}>>`
          : 'Promise<void>';
        ifaceLines.push(...buildSubResourceJsDoc(op, '    ', 2));
        ifaceLines.push(`    ${shortName}(${params.join(', ')}): ${ret};`);

        if (isPaginated(op)) {
          const allParams: string[] = [];
          for (let i = 2; i < op.pathParams.length; i++) {
            allParams.push(`${op.pathParams[i].name}: string`);
          }
          if (queryName) allParams.push(`query?: ${queryName}`);
          ifaceLines.push(...buildSubResourceJsDoc(op, '    ', 2, true));
          ifaceLines.push(
            `    ${shortName}All(${allParams.join(', ')}): PaginatedAsyncGenerator<DeepReadonly<${responseTypeName}>>;`,
          );
        }
      }
      ifaceLines.push(`  };`);
    }
    ifaceLines.push(`}`);
  }

  // --- Hydrated entry type ---
  ifaceLines.push('');
  ifaceLines.push(
    `/** A ${entityName.toLowerCase()} entry with sub-resource accessor methods. Response data properties are deeply readonly. */`,
  );
  ifaceLines.push(
    `export type ${hydratedTypeName}<T> = DeepReadonly<T> & ${accessorTypeName};`,
  );

  // --- Hydration function ---
  const fnLines: string[] = [];

  // Generate nested hydration functions first (for sub-resources with nested children)
  // Only generate if the parent sub-resource has a list method that returns entries
  for (const sub of subGroups) {
    if (!sub.nested || sub.nested.length === 0) continue;
    // Check if the parent sub-resource has a list method with entries in response
    const hasListWithEntries = sub.methods.some((op) => {
      const shortName = deriveAccessorMethodName(
        op.methodName,
        sub.originalAccessorName,
      );
      return shortName === 'list' && hasEntriesInResponse(op);
    });
    if (!hasListWithEntries) continue;
    const nestedEntity = sub.originalAccessorName.endsWith('s')
      ? sub.originalAccessorName.charAt(0).toUpperCase() +
        sub.originalAccessorName.slice(1, -1)
      : sub.originalAccessorName.charAt(0).toUpperCase() +
        sub.originalAccessorName.slice(1);
    const nestedTypeName = `${entityName}${nestedEntity}SubResources`;
    const nestedHydrateFn = `_hydrate${entityName}${nestedEntity}`;
    const nestedIdParam = sub.nested[0].nestedIdParam;

    fnLines.push(
      `/** @internal Attach sub-resource accessors to a nested ${nestedEntity.toLowerCase()} entry. */`,
    );
    fnLines.push(
      `function ${nestedHydrateFn}<T extends object>(entry: T, parentId: string, resource: ${className}): DeepReadonly<T> & ${nestedTypeName} {`,
    );
    // Derive the parent entity name for nested method name derivation
    const parentEntityForNested = sub.originalAccessorName.endsWith('s')
      ? sub.originalAccessorName.slice(0, -1)
      : sub.originalAccessorName;

    fnLines.push(`  return Object.assign(entry, {`);
    for (const nested of sub.nested) {
      fnLines.push(`    ${nested.accessorName}: {`);
      for (const op of nested.methods) {
        const shortName = deriveNestedAccessorMethodName(
          op.methodName,
          parentEntityForNested,
          nested.accessorName,
        );
        const curryParams: string[] = [];
        const fwdArgs: string[] = [
          `parentId`,
          `(entry as any).${nestedIdParam}`,
        ];
        for (let i = 2; i < op.pathParams.length; i++) {
          const p = op.pathParams[i].name;
          curryParams.push(`${p}: string`);
          fwdArgs.push(p);
        }
        if (op.hasBody && op.bodyContentType && op.bodySchema) {
          curryParams.push(`body: ${op.typePrefix}Body`);
          fwdArgs.push('body');
        }
        if (op.queryParams.length > 0) {
          curryParams.push(`query?: ${op.typePrefix}Query`);
          fwdArgs.push('query');
        }
        fnLines.push(
          `      ${shortName}: (${curryParams.join(', ')}) => resource.${op.methodName}(${fwdArgs.join(', ')}),`,
        );

        if (isPaginated(op)) {
          const allCurry: string[] = [];
          const allFwd: string[] = [
            `parentId`,
            `(entry as any).${nestedIdParam}`,
          ];
          for (let i = 2; i < op.pathParams.length; i++) {
            const p = op.pathParams[i].name;
            allCurry.push(`${p}: string`);
            allFwd.push(p);
          }
          if (op.queryParams.length > 0) {
            allCurry.push(`query?: ${op.typePrefix}Query`);
            allFwd.push('query');
          }
          fnLines.push(
            `      ${shortName}All: (${allCurry.join(', ')}) => resource.${op.methodName}All(${allFwd.join(', ')}),`,
          );
        }
      }
      fnLines.push(`    },`);
    }
    fnLines.push(`  }) as DeepReadonly<T> & ${nestedTypeName};`);
    fnLines.push(`}`);
    fnLines.push('');
  }

  // Main hydration function
  fnLines.push(
    `/** @internal Attach sub-resource accessors to a ${entityName.toLowerCase()} entry. */`,
  );
  fnLines.push(
    `function ${hydrateFnName}<T extends object>(entry: T, resource: ${className}): ${hydratedTypeName}<T> {`,
  );
  fnLines.push(`  return Object.assign(entry, {`);

  for (const sub of subGroups) {
    // Check if this sub-resource group has nested children with a usable list method
    const hasNested =
      sub.nested &&
      sub.nested.length > 0 &&
      sub.methods.some((op) => {
        const sn = deriveAccessorMethodName(
          op.methodName,
          sub.originalAccessorName,
        );
        return sn === 'list' && hasEntriesInResponse(op);
      });
    const nestedEntity = hasNested
      ? sub.originalAccessorName.endsWith('s')
        ? sub.originalAccessorName.charAt(0).toUpperCase() +
          sub.originalAccessorName.slice(1, -1)
        : sub.originalAccessorName.charAt(0).toUpperCase() +
          sub.originalAccessorName.slice(1)
      : null;
    const nestedHydrateFn = nestedEntity
      ? `_hydrate${entityName}${nestedEntity}`
      : null;

    fnLines.push(`    ${sub.accessorName}: {`);
    for (const op of sub.methods) {
      const shortName = deriveAccessorMethodName(
        op.methodName,
        sub.originalAccessorName,
      );
      // Curried params and forwarded args
      const curryParams: string[] = [];
      const fwdArgs: string[] = [`(entry as any).${primaryIdField}`];
      for (let i = 1; i < op.pathParams.length; i++) {
        const p = op.pathParams[i].name;
        curryParams.push(`${p}: string`);
        fwdArgs.push(p);
      }
      if (op.hasBody && op.bodyContentType && op.bodySchema) {
        curryParams.push(`body: ${op.typePrefix}Body`);
        fwdArgs.push('body');
      }
      if (op.queryParams.length > 0) {
        curryParams.push(`query?: ${op.typePrefix}Query`);
        fwdArgs.push('query');
      }

      // For list methods on sub-resources with nested children, wrap to hydrate entries
      if (
        hasNested &&
        nestedHydrateFn &&
        shortName === 'list' &&
        hasEntriesInResponse(op)
      ) {
        fnLines.push(
          `      ${shortName}: async (${curryParams.join(', ')}) => {`,
        );
        fnLines.push(
          `        const result = await resource.${op.methodName}(${fwdArgs.join(', ')}) as any;`,
        );
        fnLines.push(
          `        if (result.entries) result.entries = result.entries.map((e: any) => ${nestedHydrateFn}(e, (entry as any).${primaryIdField}, resource));`,
        );
        fnLines.push(`        return result;`);
        fnLines.push(`      },`);
      } else {
        fnLines.push(
          `      ${shortName}: (${curryParams.join(', ')}) => resource.${op.methodName}(${fwdArgs.join(', ')}),`,
        );
      }

      // *All variant
      if (isPaginated(op)) {
        const allCurry: string[] = [];
        const allFwd: string[] = [`(entry as any).${primaryIdField}`];
        for (let i = 1; i < op.pathParams.length; i++) {
          const p = op.pathParams[i].name;
          allCurry.push(`${p}: string`);
          allFwd.push(p);
        }
        if (op.queryParams.length > 0) {
          allCurry.push(`query?: ${op.typePrefix}Query`);
          allFwd.push('query');
        }
        fnLines.push(
          `      ${shortName}All: (${allCurry.join(', ')}) => resource.${op.methodName}All(${allFwd.join(', ')}),`,
        );
      }
    }
    fnLines.push(`    },`);
  }

  // Flat method bindings (non-collection operations)
  for (const op of flatOps) {
    const curryParams: string[] = [];
    const fwdArgs: string[] = [`(entry as any).${primaryIdField}`];
    for (let i = 1; i < op.pathParams.length; i++) {
      const p = op.pathParams[i].name;
      curryParams.push(`${p}: string`);
      fwdArgs.push(p);
    }
    if (op.hasBody && op.bodyContentType && op.bodySchema) {
      curryParams.push(`body: ${op.typePrefix}Body`);
      fwdArgs.push('body');
    }
    if (op.queryParams.length > 0) {
      curryParams.push(`query?: ${op.typePrefix}Query`);
      fwdArgs.push('query');
    }
    fnLines.push(
      `    ${op.methodName}: (${curryParams.join(', ')}) => resource.${op.methodName}(${fwdArgs.join(', ')}),`,
    );
  }

  fnLines.push(`  }) as ${hydratedTypeName}<T>;`);
  fnLines.push(`}`);

  return {
    accessorInterface: ifaceLines.join('\n'),
    hydrateFunction: fnLines.join('\n'),
    entityName,
  };
}
