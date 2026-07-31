// ---------------------------------------------------------------------------
// JSON Schema -> TypeScript type conversion for the resource code generator.
// ---------------------------------------------------------------------------

import type { SchemaObject } from './types.js';

/** Merge an array of allOf schemas into a single flat schema. */
export function mergeAllOfSchemas(schemas: SchemaObject[]): SchemaObject {
  const merged: SchemaObject = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const s of schemas) {
    // If a sub-schema itself has allOf, recursively merge it first
    const resolved = s.allOf ? mergeAllOfSchemas(s.allOf) : s;

    if (resolved.properties) {
      for (const [key, value] of Object.entries(resolved.properties)) {
        merged.properties![key] = value;
      }
    }
    if (resolved.required) {
      merged.required!.push(...resolved.required);
    }
  }

  // Deduplicate required
  merged.required = [...new Set(merged.required)];
  if (merged.required.length === 0) {
    delete merged.required;
  }

  return merged;
}

/**
 * Recursively convert a JSON Schema node to a TypeScript type string.
 * This handles the common patterns found in the OpenAPI spec:
 *   - Simple types: string, number, integer, boolean
 *   - Nullable types: type: ["string", "null"]
 *   - Enums: enum with string values
 *   - Arrays: type: "array" with items
 *   - Objects: type: "object" with properties
 *   - allOf: merged object
 *   - oneOf / anyOf: union
 *   - $ref: components reference
 *   - additionalProperties
 */
export function schemaToTsType(schema: SchemaObject, indent = 0): string {
  if (!schema) return 'unknown';

  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()!;
    return `components["schemas"]["${refName}"]`;
  }

  // Handle allOf -> merged object (preferred) or intersection
  if (schema.allOf) {
    // When every allOf member is a plain object (no unions), merge into a
    // single flat object type for readability.
    const allPlainObjects = schema.allOf.every(
      (s) =>
        !s.oneOf &&
        !s.anyOf &&
        !s.$ref &&
        (s.properties || s.allOf || s.type === 'object'),
    );
    if (allPlainObjects) {
      const merged = mergeAllOfSchemas(schema.allOf);
      if (merged.properties && Object.keys(merged.properties).length > 0) {
        return generateInlineObjectType(merged, indent);
      }
    }

    // Fall back to intersection types
    const parts = schema.allOf.map((s) => {
      const t = schemaToTsType(s, indent);
      // Wrap union types in parens so intersection binds tighter
      return t.includes('|') ? `(${t})` : t;
    });
    return parts.length === 1 ? parts[0] : parts.join(' & ');
  }

  // Handle oneOf / anyOf -> union
  // When all members are string enums (or plain string literals), deduplicate
  // the resulting union members so overlapping enum values across variants
  // (e.g. a permission field split into Connection/Inode/VersionTag groups)
  // don't produce repeated entries like `"view" | "edit" | "view" | "edit"`.
  if (schema.oneOf) {
    const variants = schema.oneOf.map((s) => schemaToTsType(s, indent));
    const allStringLiterals = variants.every((v) =>
      v.split(' | ').every((t) => t.startsWith('"') && t.endsWith('"')),
    );
    const members = allStringLiterals
      ? [...new Set(variants.flatMap((v) => v.split(' | ')))]
      : variants;
    return members.join(' | ');
  }
  if (schema.anyOf) {
    const variants = schema.anyOf.map((s) => schemaToTsType(s, indent));
    const allStringLiterals = variants.every((v) =>
      v.split(' | ').every((t) => t.startsWith('"') && t.endsWith('"')),
    );
    const members = allStringLiterals
      ? [...new Set(variants.flatMap((v) => v.split(' | ')))]
      : variants;
    return members.join(' | ');
  }

  // Handle nullable array type: type: ["string", "null"]
  if (Array.isArray(schema.type)) {
    const types = schema.type.map((t) => {
      if (t === 'null') return 'null';
      return schemaToTsType({ ...schema, type: t }, indent);
    });
    return types.join(' | ');
  }

  // Handle enum
  if (schema.enum) {
    return schema.enum
      .map((v) => (typeof v === 'string' ? `"${v}"` : String(v)))
      .join(' | ');
  }

  // Handle simple types
  switch (schema.type) {
    case 'null':
      return 'null';
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array': {
      if (schema.items) {
        const itemType = schemaToTsType(schema.items, indent);
        // Wrap complex types in parentheses for array
        const needsParens = itemType.includes('|') || itemType.includes('&');
        return needsParens ? `(${itemType})[]` : `${itemType}[]`;
      }
      return 'unknown[]';
    }
    case 'object': {
      if (schema.properties) {
        return generateInlineObjectType(schema, indent);
      }
      if (schema.additionalProperties) {
        if (typeof schema.additionalProperties === 'boolean') {
          return 'Record<string, unknown>';
        }
        const valueType = schemaToTsType(schema.additionalProperties, indent);
        return `Record<string, ${valueType}>`;
      }
      return 'Record<string, unknown>';
    }
    default:
      // If no type but has properties, treat as object
      if (schema.properties) {
        return generateInlineObjectType(schema, indent);
      }
      return 'unknown';
  }
}

/** Generate an inline object type string like `{ foo: string; bar?: number }` */
export function generateInlineObjectType(
  schema: SchemaObject,
  indent: number,
): string {
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {});
  if (props.length === 0) return 'Record<string, unknown>';

  const pad = '  '.repeat(indent + 1);
  const closePad = '  '.repeat(indent);
  const lines = props.map(([key, propSchema]) => {
    const opt = required.has(key) ? '' : '?';
    const tsType = schemaToTsType(propSchema, indent + 1);
    return `${pad}${key}${opt}: ${tsType};`;
  });

  return `{\n${lines.join('\n')}\n${closePad}}`;
}

/**
 * Recursively check if a schema contains allOf within its properties, items,
 * or other nested schemas. Intersection types generated from nested allOf
 * can produce types that are structurally similar but not assignable to the
 * openapi-fetch expected types, so we fall back to a type alias for these.
 */
export function schemaContainsNestedAllOf(schema: SchemaObject): boolean {
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (prop.allOf) return true;
      if (schemaContainsNestedAllOf(prop)) return true;
    }
  }
  if (schema.items) {
    if (schema.items.allOf) return true;
    if (schemaContainsNestedAllOf(schema.items)) return true;
  }
  if (
    schema.additionalProperties &&
    typeof schema.additionalProperties !== 'boolean'
  ) {
    if (schema.additionalProperties.allOf) return true;
    if (schemaContainsNestedAllOf(schema.additionalProperties)) return true;
  }
  if (schema.allOf) {
    if (schema.allOf.some((s) => schemaContainsNestedAllOf(s))) return true;
  }
  if (schema.oneOf) {
    if (schema.oneOf.some((s) => schemaContainsNestedAllOf(s))) return true;
  }
  if (schema.anyOf) {
    if (schema.anyOf.some((s) => schemaContainsNestedAllOf(s))) return true;
  }
  return false;
}

/**
 * Generate an exported interface with properties, JSDoc, and descriptions.
 * Returns null if the schema has no properties, contains top-level unions
 * (oneOf/anyOf directly or inside allOf), or is otherwise too complex to
 * represent as a flat interface.
 */
export function generateInterfaceFromSchema(
  interfaceName: string,
  schema: SchemaObject,
  jsdocComment: string,
  allowNestedAllOf = false,
): string | null {
  // Bail out for top-level unions — mergeAllOfSchemas would lose them
  if (schema.oneOf || schema.anyOf) return null;
  if (schema.allOf?.some((s) => s.oneOf || s.anyOf)) return null;

  // Bail out if the schema tree contains allOf within properties/items.
  // Intersection types from nested allOf can produce types that are
  // structurally similar but not assignable to the openapi-fetch expected
  // types, so we fall back to a type alias for these.
  // However, for response-only types (allowNestedAllOf=true) this is safe
  // because they are never passed as input to openapi-fetch — schemaToTsType
  // already handles nested allOf correctly via intersection types.
  if (!allowNestedAllOf && schemaContainsNestedAllOf(schema)) return null;

  // Flatten allOf if present
  const flat = schema.allOf ? mergeAllOfSchemas(schema.allOf) : schema;

  // If the flat schema has no properties, this is likely a union or complex type
  // that can't be represented as an interface
  if (!flat.properties || Object.keys(flat.properties).length === 0) {
    return null;
  }

  const required = new Set(flat.required ?? []);
  const lines: string[] = [];

  lines.push(jsdocComment);
  lines.push(`export interface ${interfaceName} {`);

  for (const [key, propSchema] of Object.entries(flat.properties)) {
    const desc = propSchema.description;
    if (desc) {
      // Use multi-line JSDoc if description is long
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
    const opt = required.has(key) ? '' : '?';
    const tsType = schemaToTsType(propSchema, 1);
    lines.push(`  ${key}${opt}: ${tsType};`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Union schema decomposition
// ---------------------------------------------------------------------------

/**
 * Convert a title string to a PascalCase suffix suitable for a type name.
 * e.g. "Export element" -> "ExportElement", "Export a page of a workbook" -> "ExportAPageOfAWorkbook"
 * Falls back to null if the title is empty or undefined.
 */
export function titleToPascalSuffix(title: string | undefined): string | null {
  if (!title || !title.trim()) return null;
  return title
    .replace(/[^a-zA-Z0-9\s]/g, '') // strip non-alphanumeric
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Decompose a schema that contains oneOf/anyOf into named sub-types.
 *
 * Handles:
 *   - Direct oneOf/anyOf at top level
 *   - allOf[ oneOf(...), sharedObj1, sharedObj2, ... ] pattern
 *
 * For each variant, generates a named interface (or type) with the parent
 * type name + a suffix derived from the variant's `title` field.
 * Shared allOf properties are merged into each variant.
 *
 * Returns an array of type declaration strings (sub-types first, then the
 * top-level union), or null if the schema cannot be decomposed.
 */
export function generateDecomposedType(
  typeName: string,
  schema: SchemaObject,
  jsdocComment: string,
): string[] | null {
  let variants: SchemaObject[] | null = null;
  let sharedSchemas: SchemaObject[] = [];

  // Pattern 1: direct oneOf/anyOf
  if (schema.oneOf) {
    variants = schema.oneOf;
  } else if (schema.anyOf) {
    variants = schema.anyOf;
  }
  // Pattern 2: allOf[ oneOf/anyOf(...), sharedObj, ... ]
  else if (schema.allOf) {
    const unionMember = schema.allOf.find((s) => s.oneOf || s.anyOf);
    if (unionMember) {
      variants = unionMember.oneOf ?? unionMember.anyOf ?? null;
      sharedSchemas = schema.allOf.filter((s) => s !== unionMember);
    }
  }

  if (!variants || variants.length === 0) return null;

  // Merge shared schemas into a single flat schema
  let sharedProps: Record<string, SchemaObject> = {};
  let sharedRequired: string[] = [];
  if (sharedSchemas.length > 0) {
    const merged = mergeAllOfSchemas(sharedSchemas);
    sharedProps = merged.properties ?? {};
    sharedRequired = merged.required ?? [];
  }

  const allDeclarations: string[] = [];
  const variantTypeNames: string[] = [];
  const usedSuffixes = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    // Derive a suffix from the variant's title, falling back to _Variant{N}
    let suffix = titleToPascalSuffix(variant.title);
    if (!suffix || usedSuffixes.has(suffix)) {
      suffix = `Variant${i + 1}`;
    }
    usedSuffixes.add(suffix);

    const variantTypeName = `${typeName}_${suffix}`;
    variantTypeNames.push(variantTypeName);

    // Resolve the variant schema — it might itself be an allOf of plain objects
    let resolvedVariant = variant;
    if (
      variant.allOf &&
      !variant.oneOf &&
      !variant.anyOf &&
      variant.allOf.every((s) => !s.oneOf && !s.anyOf)
    ) {
      resolvedVariant = mergeAllOfSchemas(variant.allOf);
    }

    // Merge shared properties into the variant
    if (Object.keys(sharedProps).length > 0 && resolvedVariant.properties) {
      resolvedVariant = {
        ...resolvedVariant,
        properties: { ...resolvedVariant.properties, ...sharedProps },
        required: [
          ...new Set([...(resolvedVariant.required ?? []), ...sharedRequired]),
        ],
      };
      if (resolvedVariant.required!.length === 0) {
        delete resolvedVariant.required;
      }
    }

    // Generate sub-types for any oneOf/anyOf properties within this variant
    if (resolvedVariant.properties) {
      for (const [propName, propSchema] of Object.entries(
        resolvedVariant.properties,
      )) {
        const propUnionSchemas = propSchema.oneOf ?? propSchema.anyOf;
        if (propUnionSchemas && propUnionSchemas.length > 0) {
          // Generate named sub-types for this property's variants
          const propTypeName = `${variantTypeName}_${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
          const propSubDeclarations: string[] = [];
          const propVariantNames: string[] = [];
          const propUsedSuffixes = new Set<string>();

          for (let j = 0; j < propUnionSchemas.length; j++) {
            let propVariant = propUnionSchemas[j];
            let propSuffix = titleToPascalSuffix(propVariant.title);
            if (!propSuffix || propUsedSuffixes.has(propSuffix)) {
              propSuffix = `Variant${j + 1}`;
            }
            propUsedSuffixes.add(propSuffix);

            const propVariantTypeName = `${propTypeName}_${propSuffix}`;
            propVariantNames.push(propVariantTypeName);

            // Resolve allOf within the property variant
            if (
              propVariant.allOf &&
              !propVariant.oneOf &&
              !propVariant.anyOf &&
              propVariant.allOf.every((s) => !s.oneOf && !s.anyOf)
            ) {
              propVariant = mergeAllOfSchemas(propVariant.allOf);
            }

            // Generate interface for this property variant
            const propVariantJsdoc = propVariant.description
              ? `/** ${propVariant.description} */`
              : '';
            if (
              propVariant.properties &&
              Object.keys(propVariant.properties).length > 0
            ) {
              const iface = generateInterfaceFromSchema(
                propVariantTypeName,
                propVariant,
                propVariantJsdoc,
                true,
              );
              if (iface) {
                propSubDeclarations.push(iface);
              } else {
                // Fall back to inline type
                const inlineType = schemaToTsType(propVariant, 0);
                propSubDeclarations.push(
                  `${propVariantJsdoc ? propVariantJsdoc + '\n' : ''}export type ${propVariantTypeName} = ${inlineType};`,
                );
              }
            } else {
              const inlineType = schemaToTsType(propVariant, 0);
              propSubDeclarations.push(
                `${propVariantJsdoc ? propVariantJsdoc + '\n' : ''}export type ${propVariantTypeName} = ${inlineType};`,
              );
            }
          }

          allDeclarations.push(...propSubDeclarations);

          // Replace the property schema with a reference to the union of sub-types
          // We do this by storing the generated type name so schemaToTsType can
          // be bypassed — we'll use a special inline type string instead
          resolvedVariant.properties[propName] = {
            ...propSchema,
            // Clear oneOf/anyOf so schemaToTsType doesn't re-inline them
            oneOf: undefined,
            anyOf: undefined,
            // Use a synthetic type marker that we'll render directly
            type: propVariantNames.join(' | ') as string,
            _syntheticUnion: true,
          } as SchemaObject;
        }
      }
    }

    // Generate the variant interface/type
    const variantJsdoc = resolvedVariant.description
      ? `/** ${resolvedVariant.description} */`
      : '';

    if (
      resolvedVariant.properties &&
      Object.keys(resolvedVariant.properties).length > 0
    ) {
      // Generate interface, rendering properties manually to handle synthetic unions
      const required = new Set(resolvedVariant.required ?? []);
      const ifaceLines: string[] = [];
      if (variantJsdoc) ifaceLines.push(variantJsdoc);
      ifaceLines.push(`export interface ${variantTypeName} {`);

      for (const [key, propSchema] of Object.entries(
        resolvedVariant.properties,
      )) {
        const desc = propSchema.description;
        if (desc) {
          if (desc.includes('\n') || desc.length > 100) {
            ifaceLines.push(`  /**`);
            for (const line of desc.split('\n')) {
              ifaceLines.push(`   * ${line}`);
            }
            ifaceLines.push(`   */`);
          } else {
            ifaceLines.push(`  /** ${desc} */`);
          }
        }
        const opt = required.has(key) ? '' : '?';
        // Check for synthetic union type (generated sub-type references)
        const isSynthetic = (propSchema as Record<string, unknown>)
          ._syntheticUnion;
        const tsType = isSynthetic
          ? (propSchema.type as string)
          : schemaToTsType(propSchema, 1);
        ifaceLines.push(`  ${key}${opt}: ${tsType};`);
      }

      ifaceLines.push(`}`);
      allDeclarations.push(ifaceLines.join('\n'));
    } else if (resolvedVariant.type === 'array') {
      // Array variant
      const inlineType = schemaToTsType(resolvedVariant, 0);
      allDeclarations.push(
        `${variantJsdoc ? variantJsdoc + '\n' : ''}export type ${variantTypeName} = ${inlineType};`,
      );
    } else {
      // Fallback: emit as inline type
      const inlineType = schemaToTsType(resolvedVariant, 0);
      allDeclarations.push(
        `${variantJsdoc ? variantJsdoc + '\n' : ''}export type ${variantTypeName} = ${inlineType};`,
      );
    }
  }

  // Generate the top-level union type
  const unionMembers = variantTypeNames.map((n) => `  | ${n}`).join('\n');
  allDeclarations.push(
    `${jsdocComment}\nexport type ${typeName} =\n${unionMembers};`,
  );

  return allDeclarations;
}
