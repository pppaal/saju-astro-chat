/**
 * Run a tuple/array of async task thunks with a bounded number of them
 * in-flight at any moment, preserving result order (and tuple types).
 *
 * `Promise.all([...])` starts every task at once. When each task checks
 * out a DB connection (e.g. the admin dashboards fire 6–9 `$queryRaw`
 * aggregates per request), that bursts the Prisma/pg connection pool and
 * is a direct contributor to ECHECKOUTTIMEOUT under load. Capping how
 * many run concurrently keeps the per-request connection footprint small
 * while still overlapping work.
 *
 * The signature mirrors `Promise.all`'s tuple handling: pass an array
 * literal of thunks and the result is a positional tuple, so destructuring
 * keeps each element's exact type.
 *
 * @param tasks Thunks returning promises. Not invoked until scheduled.
 * @param limit Max tasks in-flight at once (clamped to >= 1).
 */
export async function runWithConcurrency<T extends readonly (() => Promise<unknown>)[]>(
  tasks: readonly [...T],
  limit: number
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const max = Math.max(1, Math.floor(limit))
  const results = new Array(tasks.length)
  let next = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = next++
      if (index >= tasks.length) return
      results[index] = await tasks[index]()
    }
  }

  const workers = Array.from({ length: Math.min(max, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }
}
