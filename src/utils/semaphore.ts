/**
 * A counting semaphore that limits the number of concurrent async operations.
 *
 * Callers `await acquire()` to enter a critical section and call `release()`
 * when done. If all slots are taken, callers are queued in FIFO order and
 * unblocked one at a time as slots are released — no polling, no busy-waiting.
 *
 * Initialized with `count = 1` (the default), the semaphore acts as a mutex:
 * only one caller executes at a time, preventing thundering-herd stampedes on
 * shared resources such as in-memory caches backed by Firestore reads.
 *
 * @example
 * const sem = new Semaphore(1);
 *
 * // Manual acquire/release
 * await sem.acquire();
 * try {
 *   await doWork();
 * } finally {
 *   sem.release();
 * }
 *
 * // Or use the convenience wrapper
 * await sem.run(() => doWork());
 */
export class Semaphore {
  // Number of concurrent slots currently available.
  // Decremented on acquire, incremented on release.
  #count: number;

  // Maximum slots — used to guard against over-release.
  readonly #maxCount: number;

  // FIFO queue of resolve callbacks from callers waiting for a slot.
  // Each entry is the resolve of an acquire() Promise; calling it unblocks
  // that caller without incrementing #count (the slot transfers directly).
  #queue: Array<() => void> = [];

  /**
   * @param count Maximum number of concurrent executions allowed.
   *   Defaults to 1 (mutex — only one caller runs at a time).
   */
  constructor(count = 1) {
    this.#count = count;
    this.#maxCount = count;
  }

  /**
   * Acquires a slot. Resolves immediately if one is available, otherwise
   * waits in the queue until release() hands the slot to this caller.
   */
  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.#count > 0) {
        this.#count--;
        return resolve();
      }
      return this.#queue.push(resolve);
    });
  }

  /**
   * Releases a slot. If callers are queued, the slot transfers directly to
   * the next one (count stays the same); otherwise the slot is returned to
   * the pool (#count incremented).
   */
  release(): void {
    if (this.#queue.length > 0) {
      // Hand the slot directly to the next waiting caller, so, count stays UNCHANGED.
      const nextResolver = this.#queue.shift();
      if (nextResolver) nextResolver();
      return;
    }
    if (this.#count >= this.#maxCount) {
      throw new Error(
        `Semaphore released more times than acquired (max: ${this.#maxCount})`,
      );
    }
    this.#count++;
  }

  /** True when all slots are available and no callers are queued. */
  get isIdle(): boolean {
    return this.#count === this.#maxCount && this.#queue.length === 0;
  }

  /** Number of callers currently waiting for a slot. */
  get queueLength(): number {
    return this.#queue.length;
  }

  /**
   * Convenience wrapper: acquires a slot, runs fn, then always releases.
   * Errors from fn propagate to the caller; the slot is released regardless.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
