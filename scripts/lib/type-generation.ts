// ---------------------------------------------------------------------------
// TypeScript type generation for query params, request bodies, and responses.
// ---------------------------------------------------------------------------

import type { FieldAlias, OperationInfo } from './types.js';
import {
  schemaToTsType,
  generateInterfaceFromSchema,
  generateDecomposedType,
  titleToPascalSuffix,
} from './schema-to-ts.js';
import {
  applyFieldAliasesToSchema,
  aliasesForOperation,
} from './response-patching.js';

/**
 * Generate a named interface for an operation's query parameters.
 * Returns null if the operation has no query params.
 */
export function generateQueryInterface(
  op: OperationInfo & { methodName: string; typePrefix: string },
  className: string,
): string | null {
  if (op.queryParams.length === 0) return null;

  const interfaceName = `${op.typePrefix}Query`;
  const lines: string[] = [];

  lines.push(
    `/** Query parameters for {@link ${className}["${op.methodName}"] | ${op.methodName}}. */`,
  );
  lines.push(`export interface ${interfaceName} {`);

  for (const p of op.queryParams) {
    const desc = p.schema?.description ?? p.description;
    if (desc) {
      if (desc.includes('\n') || desc.length > 100) {
        lines.push(`  /**`);
        for (const line of desc.split('\n')) {
          lines.push(`   * ${line}`);
        }
        lines.push(`   */`);
      } else {
        lines.push(`  /** ${desc} */`);
      }
    }
    const opt = p.required ? '' : '?';
    const tsType = p.schema ? schemaToTsType(p.schema, 1) : 'string';
    lines.push(`  ${p.name}${opt}: ${tsType};`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

/**
 * Generate a named type for an operation's request body.
 * Prefers generating a full interface with documented properties when the
 * schema is a flat object.  For schemas with unions (oneOf/anyOf), tries to
 * decompose them into named sub-types.  Falls back to a type alias
 * referencing the operations type for truly degenerate schemas.
 * Returns null only if the operation has no body.
 */
export function generateBodyType(
  op: OperationInfo & { methodName: string; typePrefix: string },
  className: string,
): string | null {
  if (!op.hasBody || !op.bodyContentType || !op.bodySchema) return null;

  const typeName = `${op.typePrefix}Body`;
  const jsdoc = `/** Request body for {@link ${className}["${op.methodName}"] | ${op.methodName}}. */`;

  // multipart/form-data endpoints require a FormData object at runtime.
  // Generating a plain interface would produce a JSON-serializable type that
  // openapi-fetch would send as application/json, which the server rejects.
  if (op.bodyContentType === 'multipart/form-data') {
    return `${jsdoc}\nexport type ${typeName} = FormData;`;
  }

  // Try to generate a full interface with documented properties.
  // Note: allowNestedAllOf is kept false for body types because merged flat
  // objects can lose intersection semantics required by openapi-fetch.
  const iface = generateInterfaceFromSchema(typeName, op.bodySchema, jsdoc);
  if (iface) return iface;

  // Try to decompose union schemas into named sub-types
  const decomposed = generateDecomposedType(typeName, op.bodySchema, jsdoc);
  if (decomposed) return decomposed.join('\n\n');

  // Handle empty-object bodies (e.g. action endpoints that take no payload).
  if (
    op.bodySchema.type === 'object' &&
    (!op.bodySchema.properties ||
      Object.keys(op.bodySchema.properties).length === 0)
  ) {
    return `${jsdoc}\nexport type ${typeName} = Record<string, never>;`;
  }

  // Last resort: fall back to the operations[…] alias. This is intentional for
  // body types with nested allOf (e.g. complex connection schemas) where
  // schemaToTsType produces flat unions that are not assignable to the
  // intersection types openapi-fetch expects. The operations[…] type is always
  // structurally correct because it is derived directly from the spec.
  const ct = op.bodyContentType;
  return `${jsdoc}\nexport type ${typeName} = NonNullable<operations["${op.operationId}"]["requestBody"]>["content"]["${ct}"];`;
}

/**
 * Generate a named interface (preferred), decomposed union types, or type
 * alias for an operation's response.  Returns null if the operation has no
 * JSON response.
 *
 * When `fieldAliases` are provided for this operation, the response schema is
 * patched before generation — renaming `fromField` to `addField` directly in
 * the schema so that the correct field name and JSDoc flow through naturally.
 */
export function generateResponseType(
  op: OperationInfo & { methodName: string; typePrefix: string },
  className: string,
  fieldAliases?: FieldAlias[],
): string | null {
  if (!op.hasResponse) return null;

  const typeName = `${op.typePrefix}Response`;
  const jsdoc = `/** Response from {@link ${className}["${op.methodName}"] | ${op.methodName}}. */`;

  const aliases = aliasesForOperation(fieldAliases, op.operationId);

  const responseSchema = op.responseSchema
    ? applyFieldAliasesToSchema(op.responseSchema, aliases)
    : null;

  if (responseSchema) {
    // Try to generate a full interface with documented properties.
    // Response types are only used as return types (never passed into
    // openapi-fetch), so we can safely allow nested allOf.
    const iface = generateInterfaceFromSchema(
      typeName,
      responseSchema,
      jsdoc,
      true, // allowNestedAllOf — safe for response-only types
    );
    if (iface) return iface;

    // Try to decompose union schemas into named sub-types
    const decomposed = generateDecomposedType(typeName, responseSchema, jsdoc);
    if (decomposed) return decomposed.join('\n\n');

    // Handle bare-array responses (e.g. getWorkbookSources, listReportSources).
    // These are non-paginated endpoints whose response is a top-level array
    // rather than an { entries, nextPage } envelope.
    if (responseSchema.type === 'array') {
      const itemType = schemaToTsType(responseSchema, 0);
      return `${jsdoc}\nexport type ${typeName} = ${itemType};`;
    }

    // Handle empty-object responses (e.g. delete operations that return {}).
    if (
      responseSchema.type === 'object' &&
      (!responseSchema.properties ||
        Object.keys(responseSchema.properties).length === 0)
    ) {
      return `${jsdoc}\nexport type ${typeName} = Record<string, never>;`;
    }
  }

  // If we reach here, no generation strategy succeeded. Add a handler in
  // generateResponseType or adjust the spec schema for this operation.
  throw new Error(
    `[type-generation] Could not generate a response type for operation "${op.operationId}". ` +
      `Schema: ${JSON.stringify(op.responseSchema ?? null)}`,
  );
}

/**
 * If the response type for this operation is a decomposed union (oneOf/anyOf),
 * returns the TypeScript type name of the **first** variant — the "primary"
 * shape that hydrated single-entity methods (create/get/update) should expose.
 *
 * When a hydrated method returns `HydratedFoo<UnionType>`, TypeScript can only
 * surface properties common to all union members, which is often just the
 * injected sub-resource accessors (e.g. `grants`). Narrowing to the first
 * variant (the full workspace/member/etc. object) gives callers the complete
 * type they actually need.
 *
 * Returns `null` when the response is not a union or has no decomposable
 * variants (i.e. the full response type is already a plain interface).
 */
export function getResponsePrimaryVariantTypeName(
  op: OperationInfo & { methodName: string; typePrefix: string },
): string | null {
  if (!op.hasResponse || !op.responseSchema) return null;

  // Only applies when generateInterfaceFromSchema fails (i.e. it's a union)
  // and generateDecomposedType succeeds.
  const iface = generateInterfaceFromSchema(
    '_chk',
    op.responseSchema,
    '',
    true,
  );
  if (iface) return null; // plain interface — no narrowing needed

  const schema = op.responseSchema;

  // Determine the variants list (mirrors logic in generateDecomposedType)
  let variants = schema.oneOf ?? schema.anyOf ?? null;
  if (!variants && schema.allOf) {
    const unionMember = schema.allOf.find((s) => s.oneOf || s.anyOf);
    if (unionMember) variants = unionMember.oneOf ?? unionMember.anyOf ?? null;
  }
  if (!variants || variants.length === 0) return null;

  // Derive the suffix for the first variant (mirrors generateDecomposedType)
  const firstVariant = variants[0];
  const suffix = titleToPascalSuffix(firstVariant.title) ?? 'Variant1';

  return `${op.typePrefix}Response_${suffix}`;
}
