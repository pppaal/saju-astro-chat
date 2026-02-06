/**
 * Base Cache Manager
 * Consolidates duplicate cache manager patterns across 5+ files
 *
 * Each file was implementing similar:
 * - CacheEntry interface
 * - TTL expiration logic
 * - Max size cleanup
 * - get/set/clear methods
 * - Stats collection
 */

// ============ Types ============

export interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount?: number
}

export interface CacheStats {
  size: number
  hitRate: number
  hits: number
  misses: number
  oldestEntry: number | null
  newestEntry: number | null
}

export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttl?: number
  /** Maximum cache size (default: 500) */
  maxSize?: number
  /** Enable LRU eviction on access (default: true) */
  updateAccessOnGet?: boolean
}

// ============ Default Values ============

const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour
const DEFAULT_MAX_SIZE = 500

// ============ Base Cache Class ============

/**
 * Generic base cache manager with TTL and size limits
 *
 * @example
 * const chartCache = new BaseCache<ChartData>({ ttl: 30 * 60 * 1000, maxSize: 100 })
 * chartCache.set('key', data)
 * const cached = chartCache.get('key')
 */
export class BaseCache<T> {
  protected cache = new Map<string, CacheEntry<T>>()
  protected readonly ttl: number
  protected readonly maxSize: number
  protected readonly updateAccessOnGet: boolean

  // Stats tracking
  protected hits = 0
  protected misses = 0

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? DEFAULT_TTL
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
    this.updateAccessOnGet = options.updateAccessOnGet ?? true
  }

  /**
   * Checks if an entry is expired
   */
  protected isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttl
  }

  /**
   * Cleans up old entries when cache exceeds max size
   */
  protected cleanup(): void {
    if (this.cache.size <= this.maxSize) return

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const deleteCount = Math.floor(this.cache.size / 2)
    for (let i = 0; i < deleteCount; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  /**
   * Gets a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++

    // Update access time for LRU
    if (this.updateAccessOnGet) {
      entry.timestamp = Date.now()
      entry.accessCount = (entry.accessCount ?? 0) + 1
    }

    return entry.data
  }

  /**
   * Sets a value in the cache
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    })
    this.cleanup()
  }

  /**
   * Checks if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Deletes a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clears all entries
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    const timestamps = Array.from(this.cache.values()).map((e) => e.timestamp)

    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      hits: this.hits,
      misses: this.misses,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    }
  }

  /**
   * Gets all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Gets the current size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Removes all expired entries
   */
  pruneExpired(): number {
    let pruned = 0
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        pruned++
      }
    }
    return pruned
  }
}

// ============ Specialized Cache Classes ============

/**
 * LRU Cache with access-time based eviction
 */
export class LRUCache<T> extends BaseCache<T> {
  constructor(options: CacheOptions = {}) {
    super({ ...options, updateAccessOnGet: true })
  }

  protected override cleanup(): void {
    if (this.cache.size <= this.maxSize) return

    // Sort by last access time (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const deleteCount = this.cache.size - this.maxSize + 1
    for (let i = 0; i < deleteCount; i++) {
      this.cache.delete(entries[i][0])
    }
  }
}

/**
 * FIFO Cache with insertion-time based eviction
 */
export class FIFOCache<T> extends BaseCache<T> {
  private insertionOrder: string[] = []

  constructor(options: CacheOptions = {}) {
    super({ ...options, updateAccessOnGet: false })
  }

  override set(key: string, data: T): void {
    if (!this.cache.has(key)) {
      this.insertionOrder.push(key)
    }
    super.set(key, data)
    this.cleanupFIFO()
  }

  private cleanupFIFO(): void {
    while (this.cache.size > this.maxSize && this.insertionOrder.length > 0) {
      const oldest = this.insertionOrder.shift()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }
  }

  override clear(): void {
    super.clear()
    this.insertionOrder = []
  }

  override delete(key: string): boolean {
    const index = this.insertionOrder.indexOf(key)
    if (index > -1) {
      this.insertionOrder.splice(index, 1)
    }
    return super.delete(key)
  }
}

// ============ Factory Functions ============

/**
 * Creates a chart data cache
 */
export function createChartCache<T>(ttlMinutes = 60, maxSize = 500): BaseCache<T> {
  return new BaseCache<T>({
    ttl: ttlMinutes * 60 * 1000,
    maxSize,
  })
}

/**
 * Creates a short-lived cache for API responses
 */
export function createApiCache<T>(ttlSeconds = 300, maxSize = 100): BaseCache<T> {
  return new BaseCache<T>({
    ttl: ttlSeconds * 1000,
    maxSize,
  })
}

/**
 * Creates a long-lived cache for static data
 */
export function createStaticCache<T>(ttlHours = 24, maxSize = 1000): BaseCache<T> {
  return new BaseCache<T>({
    ttl: ttlHours * 60 * 60 * 1000,
    maxSize,
  })
}
