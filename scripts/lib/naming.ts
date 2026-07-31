// ---------------------------------------------------------------------------
// Naming / string transformation helpers for the resource code generator.
// ---------------------------------------------------------------------------

import { METHOD_NAME_OVERRIDES } from './types.js';

/** Convert a tag name like "user-attributes" to camelCase "userAttributes" */
export function tagToPropertyName(tag: string): string {
  // Handle tags with escaped colons (e.g. "allowedIps\:batchCreate")
  const base = tag.split('\\:')[0].split(':')[0];
  return base
    .replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toLowerCase());
}

/** Convert a tag to PascalCase class name, e.g. "user-attributes" -> "UserAttributesResource" */
export function tagToClassName(tag: string): string {
  const base = tag.split('\\:')[0].split(':')[0];
  const pascal = base
    .replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `${pascal}Resource`;
}

/** Convert a tag to a filename, e.g. "user-attributes" -> "user-attributes" */
export function tagToFileName(tag: string): string {
  const base = tag.split('\\:')[0].split(':')[0];
  // Convert camelCase to kebab-case
  return base
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Derive a clean method name from an operationId relative to a tag.
 *
 * Strategy:
 * 1. Strip version prefixes like "v2_1_" or "v3alpha_"
 * 2. Strip the resource-name portion from the operationId
 * 3. Return the remaining camelCased verb+qualifier
 *
 * Examples (tag="workbooks"):
 *   listWorkbooks -> list
 *   createWorkbook -> create
 *   getWorkbook -> get
 *   listWorkbookPages -> listPages
 *   getWorkbookBookmark -> getBookmark
 *   copyWorkbook -> copy
 *   v2_1_listWorkbookSchedules -> listSchedulesV2_1
 */
export function deriveMethodName(operationId: string, tag: string): string {
  let id = operationId;
  let suffix = '';

  // Detect version prefix
  const v2_1Match = id.match(/^v2_1_(.*)/);
  if (v2_1Match) {
    id = v2_1Match[1];
    suffix = 'V2_1';
  }
  const v3Match = id.match(/^v3alpha_(.*)/);
  if (v3Match) {
    id = v3Match[1];
    suffix = 'V3Alpha';
  }

  // Check overrides using the original operationId.
  // When the override key is a v2_1_ versioned operationId (e.g. v2_1_listMembers),
  // the value is returned as-is with NO version suffix — the override is an
  // explicit canonical name (e.g. "list") that should not have "V2_1" appended.
  //
  // For v3alpha_ keys the suffix IS still appended (e.g. "list" + "V3Alpha" =
  // "listV3Alpha") because those endpoints are beta and the suffix is intentional.
  // For unversioned operationIds the suffix will be empty anyway.
  if (METHOD_NAME_OVERRIDES[operationId] !== undefined) {
    if (operationId.startsWith('v2_1_')) {
      return METHOD_NAME_OVERRIDES[operationId]; // exact override, no suffix
    }
    return METHOD_NAME_OVERRIDES[operationId] + suffix;
  }

  // Normalize the tag for matching: "user-attributes" -> "UserAttribute" / "UserAttributes"
  const tagBase = tag.split('\\:')[0].split(':')[0];
  const tagWords = tagBase
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));

  const singularTag = tagWords.join('');
  // Try to get singular by stripping trailing 's'
  const singularStripped = singularTag.endsWith('s')
    ? singularTag.slice(0, -1)
    : singularTag;

  // Try stripping the tag name from the operationId (case-insensitive start after verb)
  // Find where the tag name appears in the operationId
  let methodName = id;

  // Try plural first, then singular
  for (const variant of [singularTag, singularStripped]) {
    const idx = id.indexOf(variant);
    if (idx >= 0) {
      const before = id.slice(0, idx);
      let after = id.slice(idx + variant.length);
      // Handle trailing 's' (e.g., "listWorkbooks" -> variant="Workbook", after="s")
      if (after.startsWith('s') && after[1] === undefined) {
        after = '';
      }
      // If after starts with lowercase, it's part of the tag name, skip
      if (after && /^[a-z]/.test(after)) {
        // Don't strip -- this isn't a clean boundary
        continue;
      }
      methodName = before + after;
      break;
    }
  }

  // If we ended up with an empty method name or just a verb, keep it
  if (!methodName) {
    methodName = id;
  }

  // Ensure starts with lowercase
  methodName = methodName.charAt(0).toLowerCase() + methodName.slice(1);

  return methodName + suffix;
}

/** Convert an operationId to PascalCase, e.g. "listWorkbooks" -> "ListWorkbooks" */
export function operationIdToPascal(operationId: string): string {
  return operationId.charAt(0).toUpperCase() + operationId.slice(1);
}

/**
 * Derive the primary ID field name for a resource tag.
 * e.g. "teams" -> "teamId", "workbooks" -> "workbookId",
 *      "user-attributes" -> "userAttributeId",
 *      "deployment-policies" -> "deploymentPolicyId"
 */
export function tagToIdField(tag: string): string {
  const base = tag.split('\\:')[0].split(':')[0];
  const camel = base
    .replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toLowerCase());
  // Singularize: strip trailing 's'
  const singular = camel.endsWith('s') ? camel.slice(0, -1) : camel;
  return singular + 'Id';
}

/**
 * Derive the entity name from a class name for use in generated type names.
 * e.g. "TeamsResource" -> "Team", "WorkbooksResource" -> "Workbook"
 */
export function classToEntityName(className: string): string {
  const base = className.replace(/Resource$/, '');
  // Singularize: strip trailing 's' if present
  return base.endsWith('s') ? base.slice(0, -1) : base;
}

/**
 * Format a description string for use in a JSDoc block.
 * Each line is prefixed with `${indent} * `.
 * Trailing blank lines are removed to avoid double-blank before @param tags.
 */
export function formatJsDocDescription(
  description: string,
  indent = '  ',
): string[] {
  // Split into lines and strip trailing blank lines
  const rawLines = description.split('\n');
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
    rawLines.pop();
  }

  // The SDK handles query-param encoding automatically via openapi-fetch,
  // so the spec's "you must URL encode" notes are misleading for SDK users.
  const filtered = rawLines.filter(
    (line) => !/you must URL encode.*%40/i.test(line.trim()),
  );

  const lines: string[] = [];
  for (const line of filtered) {
    if (line.trim() === '') {
      lines.push(`${indent} *`);
    } else {
      lines.push(`${indent} * ${line}`);
    }
  }
  return lines;
}
