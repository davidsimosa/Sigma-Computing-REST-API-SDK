/**
 * Pagination utilities.
 *
 * Most resource classes include built-in `*All` async generator methods
 * (e.g. `sigma.workbooks.listAll()`) that handle pagination automatically.
 *
 * The helpers below are provided for advanced use cases where you need
 * to work with pagination responses generically.
 */

/**
 * Recursively makes all properties, nested objects, and arrays readonly.
 * Used to prevent accidental mutation of API response data — assigning to
 * properties on a response object has no effect on the remote resource and
 * would silently discard the value.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends ReadonlyArray<infer U>
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/**
 * A paginated response using the `nextPage` / `page` pattern.
 * Most Sigma list endpoints follow this shape.
 */
export interface PagePaginatedResponse<TEntry> {
  entries: TEntry[];
  nextPage: string | null;
  total?: number;
  hasMore?: boolean;
}

/**
 * A paginated response using the `nextPageToken` / `pageToken` pattern.
 * Some data model endpoints follow this shape.
 */
export interface TokenPaginatedResponse<TEntry> {
  entries: TEntry[];
  nextPageToken?: string;
}

/**
 * Extracts the element type from a paginated page.
 *
 * Uses `Extract` to pick the union member that has an `entries` property,
 * avoiding duplicate types when the response is a union of structurally
 * identical variants (e.g. `SinglePage | PaginatedResults`).
 *
 * - If any union member has an `entries` array, extracts the element type from it.
 * - If `TPage` is itself an array, extracts the element type.
 * - Otherwise falls back to `TPage` itself.
 */
type PageEntry<TPage> =
  Extract<TPage, { entries: readonly unknown[] }> extends {
    entries: readonly (infer E)[];
  }
    ? E
    : TPage extends readonly (infer E)[]
      ? E
      : DeepReadonly<TPage>;

/**
 * Augments a page type so that its entries carry additional properties
 * and are deeply readonly.
 *
 * - If `TPage` has an `entries` array (possibly inside a union), each element
 *   gets `DeepReadonly<E> & TSub`.
 * - If `TPage` is itself an array, each element gets `DeepReadonly<E> & TSub`.
 * - Otherwise `TPage` itself gets `DeepReadonly<TPage> & TSub`.
 *
 * Used by generated resource classes to thread hydrated sub-resource accessor
 * types through paginated responses.
 */
export type HydratePage<TPage, TSub> =
  Extract<TPage, { entries: readonly unknown[] }> extends {
    entries: readonly (infer E)[];
  }
    ? | Exclude<TPage, { entries: readonly unknown[] }>
      | (Extract<TPage, { entries: readonly unknown[] }> & {
          entries: (DeepReadonly<E> & TSub)[];
        })
    : TPage extends readonly (infer E)[]
      ? (DeepReadonly<E> & TSub)[]
      : DeepReadonly<TPage> & TSub;

/**
 * An async generator wrapper that adds a `.toArray()` convenience method.
 * Returned by all `*All` paginated methods on resource classes.
 *
 * @example
 * ```ts
 * const workbooks = await sigma.workbooks.listAll({ limit: 100 }).toArray();
 * ```
 */
export class PaginatedAsyncGenerator<TPage> implements AsyncIterable<TPage> {
  constructor(private generator: AsyncGenerator<TPage>) {}

  [Symbol.asyncIterator](): AsyncGenerator<TPage> {
    return this.generator;
  }

  /**
   * Consume all pages and return a flat array of entries.
   *
   * If each page has an `entries` array, the entries are flattened into a
   * single array. Otherwise the pages themselves are collected.
   *
   * @param options.signal - An optional AbortSignal to cancel collection.
   */
  async toArray(options?: {
    signal?: AbortSignal;
  }): Promise<PageEntry<TPage>[]> {
    const all: PageEntry<TPage>[] = [];
    for await (const page of this.generator) {
      options?.signal?.throwIfAborted();
      if (Array.isArray(page)) {
        all.push(...(page as PageEntry<TPage>[]));
      } else {
        const p = page as Record<string, unknown>;
        if (Array.isArray(p.entries)) {
          all.push(...(p.entries as PageEntry<TPage>[]));
        } else {
          all.push(page as PageEntry<TPage>);
        }
      }
    }
    return all;
  }
}

/**
 * Collects all pages from an async generator that yields paginated pages.
 *
 * @param options.signal - An optional AbortSignal to cancel collection.
 *
 * @example
 * ```ts
 * const pages = await collectPages(sigma.workbooks.listAll({ limit: 100 }));
 * ```
 *
 * @example Abort after 5 seconds
 * ```ts
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * const pages = await collectPages(
 *   sigma.workbooks.listAll({ limit: 100 }),
 *   { signal: controller.signal },
 * );
 * ```
 */
export async function collectPages<TPage>(
  pages: AsyncIterable<TPage>,
  options?: { signal?: AbortSignal },
): Promise<TPage[]> {
  const all: TPage[] = [];
  for await (const page of pages) {
    options?.signal?.throwIfAborted();
    all.push(page);
  }
  return all;
}
