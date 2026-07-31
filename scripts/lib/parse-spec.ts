// ---------------------------------------------------------------------------
// OpenAPI spec parsing and operation analysis predicates.
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';

import type {
  OpenAPISpec,
  OperationObject,
  OperationInfo,
  ResourceGroup,
  SchemaObject,
} from './types.js';
import { HTTP_METHODS, TYPE_PREFIX_OVERRIDES } from './types.js';
import {
  deriveMethodName,
  operationIdToPascal,
  tagToClassName,
  tagToPropertyName,
} from './naming.js';

// ---------------------------------------------------------------------------
// Operation analysis predicates
// ---------------------------------------------------------------------------

/**
 * Determine if an operation likely returns paginated data.
 * We check if it has a `page` or `pageToken` query param and is a GET.
 */
export function isPaginated(op: OperationInfo): boolean {
  if (op.httpMethod !== 'GET') return false;
  return op.queryParams.some(
    (p) => p.name === 'page' || p.name === 'pageToken',
  );
}

/**
 * Check if an operation's response schema contains a top-level `entries`
 * array property. Walks through `allOf` if present.
 */
export function hasEntriesInResponse(op: OperationInfo): boolean {
  const schema = op.responseSchema;
  if (!schema) return false;

  // Direct properties
  if (schema.properties?.entries) return true;

  // Walk allOf members
  if (schema.allOf) {
    return schema.allOf.some((s) => Boolean(s.properties?.entries));
  }

  return false;
}

/**
 * Check if an operation's response schema is a top-level array.
 * These are collection endpoints that should use "list" naming.
 */
export function isArrayResponse(op: OperationInfo): boolean {
  const schema = op.responseSchema;
  if (!schema) return false;
  return schema.type === 'array';
}

// ---------------------------------------------------------------------------
// Spec parsing
// ---------------------------------------------------------------------------

export function parseSpec(specPath: string): ResourceGroup[] {
  const raw = fs.readFileSync(specPath, 'utf-8');
  const spec: OpenAPISpec = JSON.parse(raw);

  // Collect operations grouped by their first tag
  const tagMap = new Map<string, OperationInfo[]>();

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as OperationObject | undefined;
      if (!op || !op.operationId) continue;

      const tags = op.tags ?? ['misc'];
      const primaryTag = tags[0];

      const params = op.parameters ?? [];
      const pathParams = params.filter((p) => p.in === 'path');
      const queryParams = params.filter((p) => p.in === 'query');

      const hasBody = Boolean(op.requestBody);
      let bodyContentType: string | null = null;
      let bodySchema: SchemaObject | null = null;
      if (op.requestBody?.content) {
        bodyContentType =
          Object.keys(op.requestBody.content).find(
            (ct) => ct === 'application/json',
          ) ??
          Object.keys(op.requestBody.content)[0] ??
          null;
        if (bodyContentType) {
          bodySchema =
            (op.requestBody.content[bodyContentType]?.schema as SchemaObject) ??
            null;
        }
      }

      // Find the success response code
      const responseCodes = Object.keys(op.responses ?? {}).filter((c) =>
        c.startsWith('2'),
      );
      const responseCode = responseCodes[0] ?? '200';
      const successResponse = op.responses?.[responseCode];
      const hasResponse = Boolean(
        successResponse?.content?.['application/json'],
      );
      const responseSchema =
        (successResponse?.content?.['application/json']
          ?.schema as SchemaObject) ?? null;

      const info: OperationInfo = {
        httpMethod: method.toUpperCase(),
        path: pathKey,
        operationId: op.operationId,
        summary: op.summary ?? '',
        description: op.description ?? '',
        pathParams,
        queryParams,
        hasBody,
        bodyContentType,
        bodySchema,
        bodyDescription: op.requestBody?.description ?? '',
        hasResponse,
        responseCode,
        responseSchema,
      };

      if (!tagMap.has(primaryTag)) {
        tagMap.set(primaryTag, []);
      }
      tagMap.get(primaryTag)!.push(info);
    }
  }

  // Merge related tags (e.g. allowedIps, allowedIps\:batchCreate, allowedIps\:batchDelete)
  const mergedMap = new Map<string, OperationInfo[]>();
  for (const [tag, ops] of tagMap) {
    const baseTag = tag.split('\\:')[0].split(':')[0];
    if (!mergedMap.has(baseTag)) {
      mergedMap.set(baseTag, []);
    }
    mergedMap.get(baseTag)!.push(...ops);
  }

  // Build ResourceGroup for each tag
  const groups: ResourceGroup[] = [];

  for (const [tag, ops] of mergedMap) {
    const methodNames = new Set<string>();
    const operationsWithNames = ops.map((op) => {
      let methodName = deriveMethodName(op.operationId, tag);
      // Use explicit typePrefix override if provided, otherwise derive from operationId
      let typePrefix =
        TYPE_PREFIX_OVERRIDES[op.operationId] ??
        operationIdToPascal(op.operationId);

      // Normalize get* -> list* for collection endpoints (paginated or array responses)
      if (
        methodName.startsWith('get') &&
        ((isPaginated(op) && hasEntriesInResponse(op)) || isArrayResponse(op))
      ) {
        methodName = 'list' + methodName.slice(3);
        typePrefix = 'List' + typePrefix.slice(3);
      }

      // Deduplicate: if the method name already exists, fall back to operationId
      if (methodNames.has(methodName)) {
        methodName =
          op.operationId.charAt(0).toLowerCase() + op.operationId.slice(1);
        typePrefix = operationIdToPascal(op.operationId);
      }
      methodNames.add(methodName);

      return { ...op, methodName, typePrefix };
    });

    groups.push({
      tag,
      className: tagToClassName(tag),
      propertyName: tagToPropertyName(tag),
      operations: operationsWithNames,
    });
  }

  return groups.sort((a, b) => a.tag.localeCompare(b.tag));
}
