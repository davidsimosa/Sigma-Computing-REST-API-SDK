// ---------------------------------------------------------------------------
// Resource file assembly: method signatures, resource files, barrel, and
// client wiring generators.
// ---------------------------------------------------------------------------

import type { FieldAlias, OperationInfo, ResourceGroup } from './types.js';
import { tagToFileName, formatJsDocDescription } from './naming.js';
import { isPaginated } from './parse-spec.js';
import {
  generateInterfaceFromSchema,
  generateDecomposedType,
} from './schema-to-ts.js';
import {
  generateQueryInterface,
  generateBodyType,
  generateResponseType,
  getResponsePrimaryVariantTypeName,
} from './type-generation.js';
import {
  detectSubResourceGroups,
  generateSubResourceCode,
} from './sub-resources.js';
import {
  generatePatchedReturnLines,
  aliasesForOperation,
} from './response-patching.js';

// ---------------------------------------------------------------------------
// Method signature generation
// ---------------------------------------------------------------------------

export function generateMethodSignature(
  op: OperationInfo & { methodName: string; typePrefix: string },
  _className: string,
  hydrateEntity?: string,
  fieldAliases?: FieldAlias[],
): string {
  const lines: string[] = [];
  const args: string[] = [];
  const paramDocs: string[] = [];

  const queryInterfaceName =
    op.queryParams.length > 0 ? `${op.typePrefix}Query` : null;
  const bodyTypeName =
    op.hasBody && op.bodyContentType && op.bodySchema
      ? `${op.typePrefix}Body`
      : null;
  const responseTypeName = op.hasResponse ? `${op.typePrefix}Response` : null;

  // Build JSDoc
  lines.push(`  /**`);
  if (op.summary) {
    lines.push(`   * ${op.summary}`);
  }

  lines.push(
    `   *`,
    `   * Source docs: https://help.sigmacomputing.com/reference/${op.operationId.toLowerCase()}`,
  );

  if (op.description) {
    lines.push(`   *`);
    lines.push(...formatJsDocDescription(op.description));
  }

  // @param tags
  for (const p of op.pathParams) {
    const desc = p.schema?.description ?? p.description;
    if (desc) {
      paramDocs.push(`   * @param ${p.name} - ${desc}`);
    } else {
      paramDocs.push(`   * @param ${p.name}`);
    }
  }
  if (op.hasBody && op.bodyContentType) {
    const desc = op.bodyDescription || 'The request body.';
    paramDocs.push(`   * @param body - ${desc}`);
  }
  if (op.queryParams.length > 0) {
    paramDocs.push(`   * @param query - Query parameters`);
  }

  if (paramDocs.length > 0) {
    lines.push(`   *`);
    lines.push(...paramDocs);
  }

  // @returns
  if (responseTypeName) {
    lines.push(`   * @returns ${responseTypeName}`);
  }

  // Emit a @remarks note for each field alias that applies to this operation
  for (const a of aliasesForOperation(fieldAliases, op.operationId)) {
    lines.push(
      `   *`,
      `   * @remarks SDK patch: \`${a.addField}\` is substituted for \`${a.fromField}\` in the response. ${a.description}`,
    );
  }

  lines.push(`   */`);

  // Path params as positional string arguments
  for (const p of op.pathParams) {
    args.push(`${p.name}: string`);
  }

  // Request body comes before query (body is required, query is optional)
  if (op.hasBody && op.bodyContentType) {
    args.push(`body: ${bodyTypeName}`);
  }

  // Query params as optional object
  if (queryInterfaceName) {
    args.push(`query?: ${queryInterfaceName}`);
  }

  const argsStr = args.join(', ');
  const httpMethod = op.httpMethod;
  const pathLiteral = op.path;

  // Return type annotation
  // All response data is wrapped with DeepReadonly to prevent accidental mutation.
  // Hydrated types (HydratedX, HydratePage) apply DeepReadonly internally.
  //
  // primaryVariantTypeName is non-null when the response is a decomposed union
  // (oneOf/anyOf). It holds the first variant's type name so hydrated methods
  // can use it instead of the full union (see comment in the method body below).
  let primaryVariantTypeName: string | null = null;
  let returnType: string;
  if (op.hasResponse && responseTypeName) {
    if (hydrateEntity) {
      const baseName = op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '');
      if (baseName === 'list') {
        // List methods: augment entries inside the page with sub-resource accessors
        returnType = `Promise<HydratePage<${responseTypeName}, ${hydrateEntity}SubResources>>`;
      } else {
        // get/create/update: the response itself is the entry.
        // When the response is a decomposed union (oneOf/anyOf), intersecting
        // the full union with sub-resource accessors via HydratedX<UnionType>
        // causes TypeScript to only surface properties common to all union
        // members — which is often just the injected accessors. Use the first
        // (primary) variant instead so callers get the complete object type.
        primaryVariantTypeName = getResponsePrimaryVariantTypeName(op);
        const entityTypeName = primaryVariantTypeName ?? responseTypeName;
        returnType = `Promise<Hydrated${hydrateEntity}<${entityTypeName}>>`;
      }
    } else {
      returnType = `Promise<DeepReadonly<${responseTypeName}>>`;
    }
  } else {
    returnType = `Promise<void>`;
  }

  // Build the params object for openapi-fetch
  const paramParts: string[] = [];
  if (op.pathParams.length > 0) {
    const pathObj = op.pathParams.map((p) => p.name).join(', ');
    paramParts.push(`path: { ${pathObj} }`);
  }
  if (op.queryParams.length > 0) {
    paramParts.push('query');
  }

  const hasParams = paramParts.length > 0;
  const hasBodyArg = op.hasBody && op.bodyContentType;

  // Build init object
  const initParts: string[] = [];
  if (hasParams) {
    initParts.push(`params: { ${paramParts.join(', ')} }`);
  }
  if (hasBodyArg) {
    if (op.bodyContentType === 'application/json') {
      initParts.push('body');
    } else if (op.bodyContentType === 'multipart/form-data') {
      // Cast body as never to satisfy openapi-fetch's path-derived type, then
      // use an identity bodySerializer so the FormData is passed through to
      // fetch without JSON serialization. The fetch API sets the correct
      // Content-Type (multipart/form-data with boundary) automatically when a
      // FormData instance is the body.
      initParts.push('body: body as never');
      initParts.push('bodySerializer: (b: unknown) => b');
    } else {
      initParts.push(`body: body as never`);
    }
  }

  const initStr = initParts.length > 0 ? `{ ${initParts.join(', ')} }` : '';

  lines.push(`  async ${op.methodName}(${argsStr}): ${returnType} {`);

  if (op.hasResponse) {
    if (initStr) {
      lines.push(
        `    const { data, error, response } = await this.client.${httpMethod}("${pathLiteral}", ${initStr});`,
      );
    } else {
      lines.push(
        `    const { data, error, response } = await this.client.${httpMethod}("${pathLiteral}");`,
      );
    }
    lines.push(`    if (error) throw new SigmaApiError(error, response);`);
    if (hydrateEntity) {
      const hydrateFn = `_hydrate${hydrateEntity}`;
      const baseName = op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '');
      const isListMethod = baseName === 'list';
      if (isListMethod) {
        // List response: hydrate entries within the response.
        // Handles both array responses and paginated { entries: [...] } responses.
        lines.push(`    const result = data! as any;`);
        lines.push(`    if (Array.isArray(result)) {`);
        lines.push(
          `      return result.map((e: any) => ${hydrateFn}(e, this)) as any;`,
        );
        lines.push(`    }`);
        lines.push(
          `    if (result.entries && Array.isArray(result.entries)) {`,
        );
        lines.push(
          `      result.entries = result.entries.map((e: any) => ${hydrateFn}(e, this));`,
        );
        lines.push(`    }`);
        lines.push(`    return result;`);
      } else {
        // Single resource response (get, create, update): hydrate the response itself.
        if (primaryVariantTypeName) {
          // The OpenAPI spec declares a oneOf response for this endpoint. The full
          // union (${responseTypeName}) is narrowed to ${primaryVariantTypeName}
          // (the primary/documented shape) so that sub-resource accessors are
          // accessible alongside the response fields. If the spec is updated to
          // remove the legacy variant, re-run `npm run generate` to clean this up.
          lines.push(
            `    // NOTE: return type is narrowed from ${responseTypeName} to ${primaryVariantTypeName}.`,
            `    // The spec declares a oneOf response; the full union collapses sub-resource`,
            `    // accessors when intersected. Re-run \`npm run generate\` if the spec is fixed.`,
          );
        }
        lines.push(`    return ${hydrateFn}(data! as any, this);`);
      }
    } else {
      const patchedLines = generatePatchedReturnLines(op, fieldAliases);
      if (patchedLines) {
        lines.push(...patchedLines);
      } else {
        lines.push(`    return data!;`);
      }
    }
  } else {
    // No response body (e.g. 204 No Content)
    if (initStr) {
      lines.push(
        `    const { error, response } = await this.client.${httpMethod}("${pathLiteral}", ${initStr});`,
      );
    } else {
      lines.push(
        `    const { error, response } = await this.client.${httpMethod}("${pathLiteral}");`,
      );
    }
    lines.push(`    if (error) throw new SigmaApiError(error, response);`);
  }

  lines.push(`  }`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// listAll method generation
// ---------------------------------------------------------------------------

export function generateListAllMethod(
  op: OperationInfo & { methodName: string; typePrefix: string },
  _className: string,
  _hydrateEntity?: string,
  fieldAliases?: FieldAlias[],
): string {
  const lines: string[] = [];
  const args: string[] = [];

  const queryInterfaceName =
    op.queryParams.length > 0 ? `${op.typePrefix}Query` : null;
  const responseTypeName = op.hasResponse ? `${op.typePrefix}Response` : null;

  // Path params as positional string arguments
  for (const p of op.pathParams) {
    args.push(`${p.name}: string`);
  }

  // Query params as optional object
  if (queryInterfaceName) {
    args.push(`query?: ${queryInterfaceName}`);
  }

  const argsStr = args.join(', ');
  const allMethodName = op.methodName + 'All';

  // Determine pagination style (page/nextPage vs pageToken/nextPageToken)
  const usesPageToken = op.queryParams.some((p) => p.name === 'pageToken');
  const cursorParam = usesPageToken ? 'pageToken' : 'page';
  const responseCursor = usesPageToken ? 'nextPageToken' : 'nextPage';

  // Return type
  let returnType: string;
  if (responseTypeName) {
    if (_hydrateEntity) {
      returnType = `PaginatedAsyncGenerator<HydratePage<${responseTypeName}, ${_hydrateEntity}SubResources>>`;
    } else {
      returnType = `PaginatedAsyncGenerator<DeepReadonly<${responseTypeName}>>`;
    }
  } else {
    returnType = `PaginatedAsyncGenerator<unknown>`;
  }

  // JSDoc
  lines.push(`  /**`);
  lines.push(
    `   * ${op.summary ? op.summary + ' (auto-paginate all pages)' : 'Auto-paginate all pages'}`,
  );

  lines.push(
    `   *`,
    `   * Source docs: https://help.sigmacomputing.com/reference/${op.operationId.toLowerCase()}`,
  );

  if (op.description) {
    lines.push(`   *`);
    lines.push(...formatJsDocDescription(op.description));
  }

  // @param tags
  const paramDocs: string[] = [];
  for (const p of op.pathParams) {
    const desc = p.schema?.description ?? p.description;
    if (desc) {
      paramDocs.push(`   * @param ${p.name} - ${desc}`);
    } else {
      paramDocs.push(`   * @param ${p.name}`);
    }
  }
  if (queryInterfaceName) {
    paramDocs.push(`   * @param query - Query parameters`);
  }
  if (paramDocs.length > 0) {
    lines.push(`   *`);
    lines.push(...paramDocs);
  }
  if (responseTypeName) {
    lines.push(`   * @yields ${responseTypeName}`);
  }

  // Emit a @remarks note for each field alias that applies to this operation
  for (const a of aliasesForOperation(fieldAliases, op.operationId)) {
    lines.push(
      `   *`,
      `   * @remarks SDK patch: \`${a.addField}\` is substituted for \`${a.fromField}\` in the response. ${a.description}`,
    );
  }

  lines.push(`   */`);

  lines.push(`  ${allMethodName}(${argsStr}): ${returnType} {`);
  lines.push(
    `    // eslint-disable-next-line @typescript-eslint/no-this-alias`,
  );
  lines.push(`    const resource = this;`);
  lines.push(`    async function* gen() {`);
  lines.push(`      let cursor: string | undefined;`);
  lines.push(`      do {`);

  // Build call arguments
  const callArgs: string[] = [];
  for (const p of op.pathParams) {
    callArgs.push(p.name);
  }

  if (op.queryParams.length > 0) {
    if (queryInterfaceName) {
      callArgs.push(
        `{ ...query, ${cursorParam}: cursor } as ${queryInterfaceName}`,
      );
    } else {
      callArgs.push(`{ ${cursorParam}: cursor } as never`);
    }
  } else {
    callArgs.push(`{ ${cursorParam}: cursor } as never`);
  }

  lines.push(
    `        const page = await resource.${op.methodName}(${callArgs.join(', ')});`,
  );
  lines.push(`        yield page;`);
  lines.push(
    `        cursor = (page as { ${responseCursor}?: string | null })["${responseCursor}"] as string | undefined;`,
  );
  lines.push(`      } while (cursor);`);
  lines.push(`    }`);
  lines.push(`    return new PaginatedAsyncGenerator(gen());`);
  lines.push(`  }`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Resource file generation
// ---------------------------------------------------------------------------

export function generateResourceFile(
  group: ResourceGroup,
  fieldAliases?: FieldAlias[],
): string {
  const lines: string[] = [];

  /**
   * Returns true if the given schema will be fully resolved by the type
   * generator (via interface, decomposed union, bare-array, or empty-object
   * branch) rather than falling back to an `operations[…]` type alias.
   * Used to determine whether the `operations` import is needed.
   */
  function schemaIsResolved(
    schema: import('./types.js').SchemaObject,
    allowNested: boolean,
  ): boolean {
    if (generateInterfaceFromSchema('_chk', schema, '', allowNested))
      return true;
    if (generateDecomposedType('_chk', schema, '')) return true;
    // Bare-array responses are handled by the array branch in generateResponseType
    if (schema.type === 'array') return true;
    // Empty-object schemas (e.g. delete returning {} or action with no payload)
    if (
      schema.type === 'object' &&
      (!schema.properties || Object.keys(schema.properties).length === 0)
    )
      return true;
    return false;
  }

  // Check whether `operations` is needed in the import.  It is referenced by
  // body/response type aliases when neither interface nor decomposition works.
  const needsOperations = group.operations.some((op) => {
    // Body type alias uses operations[…] when all strategies fail
    // (allowNested=false for bodies to preserve openapi-fetch assignability)
    if (op.hasBody && op.bodyContentType && op.bodySchema) {
      if (!schemaIsResolved(op.bodySchema, false)) return true;
    }
    // Response type alias uses operations[…] when all strategies fail
    if (op.hasResponse && op.responseSchema) {
      if (!schemaIsResolved(op.responseSchema, true)) return true;
    }
    // Note: hasResponse && !responseSchema is intentionally omitted — generateResponseType
    // now throws for that case rather than emitting an operations[…] alias.
    return false;
  });

  // Check if any generated interface or decomposed type uses $ref
  // (needs `components` type).
  const needsComponents = group.operations.some((op) => {
    // Check body schemas
    if (op.bodySchema) {
      const json = JSON.stringify(op.bodySchema);
      if (json.includes('"$ref"') && schemaIsResolved(op.bodySchema, false)) {
        return true;
      }
    }
    // Check response schemas
    if (op.responseSchema) {
      const json = JSON.stringify(op.responseSchema);
      if (
        json.includes('"$ref"') &&
        schemaIsResolved(op.responseSchema, true)
      ) {
        return true;
      }
    }
    return false;
  });

  lines.push(
    '// AUTO-GENERATED by scripts/generate-resources.ts -- DO NOT EDIT',
  );
  lines.push(`import type { Client } from "openapi-fetch";`);

  const importedTypes: string[] = ['paths'];
  if (needsOperations) importedTypes.push('operations');
  if (needsComponents) importedTypes.push('components');
  lines.push(
    `import type { ${importedTypes.join(', ')} } from "../generated/openapi";`,
  );
  lines.push(`import { SigmaApiError } from "../errors";`);

  // --- Pre-compute sub-resource hydration info (needed for imports) ---
  const { groups: subGroups, flatOps } = detectSubResourceGroups(group);
  const subResourceCode = generateSubResourceCode(group, subGroups, flatOps);

  const primaryMethodNames = new Set(['list', 'get', 'create', 'update']);
  const hasPrimaryMethods =
    subResourceCode &&
    group.operations.some(
      (op) =>
        primaryMethodNames.has(
          op.methodName.replace(/V\d+_\d+$|V3Alpha$/, ''),
        ) && op.hasResponse,
    );

  // Import PaginatedAsyncGenerator, HydratePage, and DeepReadonly as needed
  const hasPaginated = group.operations.some((op) => isPaginated(op));
  const hasAnyResponse = group.operations.some((op) => op.hasResponse);
  if (hasPaginated) {
    const paginationImports: string[] = [
      'PaginatedAsyncGenerator',
      'DeepReadonly',
    ];
    if (hasPrimaryMethods) {
      paginationImports.push('HydratePage');
    }
    lines.push(
      `import { ${paginationImports.join(', ')} } from "../pagination";`,
    );
  } else if (hasPrimaryMethods) {
    // Non-paginated resource with hydration still needs HydratePage for list methods
    const hasListMethod = group.operations.some(
      (op) =>
        op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '') === 'list' &&
        op.hasResponse,
    );
    if (hasListMethod) {
      lines.push(`import { HydratePage, DeepReadonly } from "../pagination";`);
    } else if (hasAnyResponse) {
      lines.push(`import { DeepReadonly } from "../pagination";`);
    }
  } else if (hasAnyResponse) {
    lines.push(`import { DeepReadonly } from "../pagination";`);
  }

  // --- Generate query parameter interfaces ---
  const queryInterfaces: string[] = [];
  for (const op of group.operations) {
    const iface = generateQueryInterface(op, group.className);
    if (iface) queryInterfaces.push(iface);
  }

  if (queryInterfaces.length > 0) {
    lines.push('');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    lines.push('// Query parameter interfaces');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    for (const iface of queryInterfaces) {
      lines.push('');
      lines.push(iface);
    }
  }

  // --- Generate request body types (interfaces or type aliases) ---
  const bodyTypes: string[] = [];
  for (const op of group.operations) {
    const bodyType = generateBodyType(op, group.className);
    if (bodyType) {
      bodyTypes.push(bodyType);
    }
  }

  if (bodyTypes.length > 0) {
    lines.push('');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    lines.push('// Request body types');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    for (const bodyType of bodyTypes) {
      lines.push('');
      lines.push(bodyType);
    }
  }

  // --- Generate response types (interfaces or type aliases) ---
  const responseTypes: string[] = [];
  for (const op of group.operations) {
    const responseType = generateResponseType(
      op,
      group.className,
      fieldAliases,
    );
    if (responseType) responseTypes.push(responseType);
  }

  if (responseTypes.length > 0) {
    lines.push('');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    lines.push('// Response types');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    for (const responseType of responseTypes) {
      lines.push('');
      lines.push(responseType);
    }
  }

  // --- Sub-resource accessor types and hydration ---
  // (subGroups, subResourceCode, primaryMethodNames, hasPrimaryMethods
  //  are computed earlier for import generation)

  if (hasPrimaryMethods && subResourceCode) {
    lines.push('');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    lines.push('// Sub-resource accessors (hydration)');
    lines.push(
      '// ---------------------------------------------------------------------------',
    );
    lines.push('');
    lines.push(subResourceCode.accessorInterface);
  }

  // --- Resource class ---
  lines.push('');
  lines.push(
    '// ---------------------------------------------------------------------------',
  );
  lines.push(`// ${group.className}`);
  lines.push(
    '// ---------------------------------------------------------------------------',
  );
  lines.push('');

  // If we have sub-resource code and primary methods, emit the hydration
  // function before the class
  if (hasPrimaryMethods && subResourceCode) {
    lines.push(subResourceCode.hydrateFunction);
    lines.push('');
  }

  lines.push(`export class ${group.className} {`);
  lines.push(`  constructor(private client: Client<paths>) {}`);

  for (const op of group.operations) {
    const isPrimaryOp =
      hasPrimaryMethods &&
      subResourceCode &&
      primaryMethodNames.has(op.methodName.replace(/V\d+_\d+$|V3Alpha$/, '')) &&
      op.hasResponse;

    lines.push('');
    lines.push(
      generateMethodSignature(
        op,
        group.className,
        isPrimaryOp ? subResourceCode.entityName : undefined,
        fieldAliases,
      ),
    );

    // Generate listAll for paginated GET endpoints
    if (isPaginated(op)) {
      lines.push('');
      lines.push(
        generateListAllMethod(
          op,
          group.className,
          isPrimaryOp ? subResourceCode.entityName : undefined,
          fieldAliases,
        ),
      );
    }
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Barrel and client wiring
// ---------------------------------------------------------------------------

export function generateBarrel(groups: ResourceGroup[]): string {
  const lines: string[] = [];
  lines.push(
    '// AUTO-GENERATED by scripts/generate-resources.ts -- DO NOT EDIT',
  );

  for (const group of groups) {
    const fileName = tagToFileName(group.tag);
    lines.push(`export * from "./${fileName}";`);
  }

  lines.push('');
  return lines.join('\n');
}

export function generateClientResourceImports(groups: ResourceGroup[]): {
  imports: string;
  properties: string;
  assignments: string;
} {
  const importLines: string[] = [];
  const propertyLines: string[] = [];
  const assignmentLines: string[] = [];

  for (const group of groups) {
    const fileName = tagToFileName(group.tag);
    importLines.push(
      `import { ${group.className} } from "./resources/${fileName}";`,
    );
    propertyLines.push(`  ${group.propertyName}: ${group.className};`);
    assignmentLines.push(
      `    ${group.propertyName}: new ${group.className}(httpClient),`,
    );
  }

  return {
    imports: importLines.join('\n'),
    properties: propertyLines.join('\n'),
    assignments: assignmentLines.join('\n'),
  };
}
