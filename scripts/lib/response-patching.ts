// ---------------------------------------------------------------------------
// Runtime response-patching code generation.
//
// FIELD_ALIASES is the single source of truth for all response field patches.
// It drives:
//   - Type generation (adds the aliased field to generated interfaces)
//   - Runtime code generation (emits the rename + validation in resource methods)
//
// ---------------------------------------------------------------------------

import type { FieldAlias, OperationInfo, SchemaObject } from './types.js';

/** Raw regex string for the URL slug format Sigma returns in the grants API `inodeId` field. */
export const GRANTS_SLUG_PATTERN_STR = '^[A-Za-z0-9]+$';

/**
 * Declarative list of field aliases applied to generated resource methods.
 *
 * Each entry renames `fromField` to `addField` in the runtime response and
 * optionally validates the value against a regex pattern at runtime.
 */
export const FIELD_ALIASES: FieldAlias[] = [
  {
    operationIds: ['listGrants', 'createGrant', 'getGrant', 'deleteGrant'],
    addField: 'urlId',
    fromField: 'inodeId',
    description:
      'Sigma API bug: grant.inodeId returns the URL slug instead of the UUID for all inode types (workbooks, folders, data models, etc.). urlId makes this explicit. Remove when Sigma fixes the inconsistency.',
    validate: GRANTS_SLUG_PATTERN_STR,
  },
];

// ---------------------------------------------------------------------------
// Schema patching (type-generation side)
// ---------------------------------------------------------------------------

/**
 * Renames `fromField` to `toField` (updating its description) in every
 * property map reachable from `schema`.  Walks into `allOf` members
 * recursively, since the OpenAPI spec wraps most object schemas in allOf.
 */
export function renamePropertyInSchema(
  schema: SchemaObject,
  fromField: string,
  toField: string,
  description: string,
): void {
  if (schema.properties && fromField in schema.properties) {
    schema.properties[toField] = {
      ...schema.properties[fromField],
      description,
    };
    delete schema.properties[fromField];

    if (schema.required) {
      const idx = schema.required.indexOf(fromField);
      if (idx !== -1) schema.required[idx] = toField;
    }
  }

  if (schema.allOf) {
    for (const member of schema.allOf) {
      renamePropertyInSchema(member, fromField, toField, description);
    }
  }

  const entriesSchema = schema.properties?.entries;
  if (entriesSchema?.items) {
    renamePropertyInSchema(
      entriesSchema.items,
      fromField,
      toField,
      description,
    );
  }
}

/**
 * Deep-clones a SchemaObject and renames `fromField` to `addField` (with the
 * alias description) wherever it appears as a direct property — both at the
 * top level and inside an `entries` array items schema.  All other structure
 * is preserved unchanged.
 *
 * This lets `generateInterfaceFromSchema` emit the correct field name and
 * JSDoc without any post-generation string patching.
 */
export function applyFieldAliasesToSchema(
  schema: SchemaObject,
  aliases: FieldAlias[],
): SchemaObject {
  if (aliases.length === 0) return schema;

  const clone = structuredClone(schema);

  for (const alias of aliases) {
    renamePropertyInSchema(
      clone,
      alias.fromField,
      alias.addField,
      alias.description,
    );
  }

  return clone;
}

// ---------------------------------------------------------------------------
// Runtime patching helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if `schema` (or any of its allOf members) declares a property
 * with the given name.  Used to distinguish list responses ({ entries: [...] })
 * from single-entity responses without relying on the method name.
 */
export function schemaHasProperty(
  schema: SchemaObject | null,
  prop: string,
): boolean {
  if (!schema) return false;
  if (schema.properties && prop in schema.properties) return true;
  if (schema.allOf) return schema.allOf.some((s) => schemaHasProperty(s, prop));
  return false;
}

/**
 * Returns the subset of `fieldAliases` that apply to `operationId`.
 */
export function aliasesForOperation(
  fieldAliases: FieldAlias[] | undefined,
  operationId: string,
): FieldAlias[] {
  return (fieldAliases ?? []).filter((a) =>
    a.operationIds.includes(operationId),
  );
}

/**
 * Builds the inline validation expression for a single alias.
 *
 * Example output:
 *   `if (!\/^[A-Za-z0-9]+$\/.test(inodeId)) throw new Error(...);`
 */
function validationLine(a: FieldAlias, indent: string): string {
  return `${indent}if (!/${a.validate}/.test(${a.fromField})) throw new Error(\`[SDK patch] ${a.fromField} value "\${${a.fromField}}" (exposed as ${a.addField}) does not match /${a.validate}/. The upstream API may have changed — review FIELD_ALIASES in scripts/lib/response-patching.ts.\`);`;
}

/**
 * Generates the method-body lines that apply `aliases` to a **list** response
 * (one whose schema has an `entries` array).
 *
 * Emitted shape:
 * ```
 * return { ...data!, entries: (data! as any).entries?.map(({ fromField, ...rest }: any) => {
 *   if (!/<validate>/.test(fromField)) throw ...;
 *   return { ...rest, addField: fromField };
 * }) ?? [] } as any;
 * ```
 */
export function generateListPatchLines(aliases: FieldAlias[]): string[] {
  const destructured = aliases.map((a) => a.fromField).join(', ');
  const renames = aliases
    .map((a) => `${a.addField}: ${a.fromField}`)
    .join(', ');
  const validatingAliases = aliases.filter((a) => a.validate);

  let mapBody: string;
  if (validatingAliases.length > 0) {
    const validationLines = validatingAliases
      .map((a) => validationLine(a, '      '))
      .join('\n');
    mapBody =
      `{ ${destructured}, ...rest }: any) => {\n` +
      `${validationLines}\n` +
      `      return { ...rest, ${renames} };\n` +
      `    }`;
  } else {
    mapBody = `{ ${destructured}, ...rest }: any) => ({ ...rest, ${renames} })`;
  }

  return [
    `    return { ...data!, entries: (data! as any).entries?.map((${mapBody}) ?? [] } as any;`,
  ];
}

/**
 * Generates the method-body lines that apply `aliases` to a **single-entity**
 * response (get / create / upsert / etc.).
 *
 * Emitted shape:
 * ```
 * const { fromField, ...rest } = data! as any;
 * if (!/<validate>/.test(fromField)) throw ...;
 * return { ...rest, addField: fromField } as any;
 * ```
 */
export function generateSinglePatchLines(aliases: FieldAlias[]): string[] {
  const destructured = aliases.map((a) => a.fromField).join(', ');
  const renames = aliases
    .map((a) => `${a.addField}: ${a.fromField}`)
    .join(', ');

  const lines: string[] = [];
  lines.push(`    const { ${destructured}, ...rest } = data! as any;`);
  for (const a of aliases.filter((al) => al.validate)) {
    lines.push(validationLine(a, '    '));
  }
  lines.push(`    return { ...rest, ${renames} } as any;`);
  return lines;
}

/**
 * Generates the method-body `return` lines for `op`, applying any matching
 * field aliases.  Returns `null` when no aliases apply (caller should emit
 * the plain `return data!;` instead).
 */
export function generatePatchedReturnLines(
  op: OperationInfo & { operationId: string },
  fieldAliases: FieldAlias[] | undefined,
): string[] | null {
  const aliases = aliasesForOperation(fieldAliases, op.operationId);
  if (aliases.length === 0) return null;

  const isListResponse = schemaHasProperty(op.responseSchema, 'entries');
  return isListResponse
    ? generateListPatchLines(aliases)
    : generateSinglePatchLines(aliases);
}
