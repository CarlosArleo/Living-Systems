// ===============================
// 🗄️ FIREBASE OPTIMIZATION
// ===============================

// src/lib/firebase/optimized-client.ts - Optimized Firebase Configuration
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  // Your config here
}

// Singleton pattern for Firebase initialization
export function getFirebaseApp() {
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig)
    return app
  }
  return getApps()[0]
}

// Optimized Firestore with offline persistence
export function getOptimizedFirestore() {
  const app = getFirebaseApp()
  const db = getFirestore(app)
  
  // Enable offline persistence (only on client)
  if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.')
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support persistence.')
      }
    })
  }

  // Connect to emulators in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080)
    } catch (error) {
      // Already connected
    }
  }

  return db
}

// Optimized Functions client
export function getOptimizedFunctions() {
  const app = getFirebaseApp()
  const functions = getFunctions(app)

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001)
    } catch (error) {
      // Already connected
    }
  }

  return functions
}

// ===============================
// 💾 ADVANCED CACHING SYSTEM
// ===============================

// src/lib/cache/optimized-cache.ts - Multi-Layer Caching System
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
  hits: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number
  strategy?: 'LRU' | 'LFU' | 'TTL'
}

export class OptimizedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>()
  private accessOrder: string[] = []
  private maxSize: number
  private strategy: 'LRU' | 'LFU' | 'TTL'
  private defaultTTL: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    this.strategy = options.strategy || 'LRU'
    this.defaultTTL = options.ttl || 300000 // 5 minutes default
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expiry = now + (ttl || this.defaultTTL)

    // Remove expired entries before adding new ones
    this.cleanup()

    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiry,
      hits: 0
    })

    // Update access order for LRU
    if (this.strategy === 'LRU') {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.accessOrder.push(key)
    }
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return null
    }

    // Update access statistics
    item.hits++
    
    // Update access order for LRU
    if (this.strategy === 'LRU') {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.accessOrder.push(key)
    }

    return item.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    this.removeFromAccessOrder(key)
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  size(): number {
    return this.cache.size
  }

  private evict(): void {
    if (this.cache.size === 0) return

    let keyToRemove: string | undefined

    switch (this.strategy) {
      case 'LRU':
        keyToRemove = this.accessOrder[0]
        break
      case 'LFU':
        let minHits = Infinity
        for (const [key, item] of this.cache.entries()) {
          if (item.hits < minHits) {
            minHits = item.hits
            keyToRemove = key
          }
        }
        break
      case 'TTL':
        let earliestExpiry = Infinity
        for (const [key, item] of this.cache.entries()) {
          if (item.expiry < earliestExpiry) {
            earliestExpiry = item.expiry
            keyToRemove = key
          }
        }
        break
    }

    if (keyToRemove) {
      this.delete(keyToRemove)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.delete(key))
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      strategy: this.strategy,
      hitRatio: this.calculateHitRatio(),
    }
  }

  private calculateHitRatio(): number {
    let totalHits = 0
    let totalRequests = 0

    for (const item of this.cache.values()) {
      totalHits += item.hits
      totalRequests += item.hits + 1 // +1 for initial miss
    }

    return totalRequests > 0 ? totalHits / totalRequests : 0
  }
}

// Global cache instances
export const memoryCache = new OptimizedCache({ 
  maxSize: 500, 
  strategy: 'LRU', 
  ttl: 300000 
})

export const aiResponseCache = new OptimizedCache({ 
  maxSize: 100, 
  strategy: 'LFU', 
  ttl: 600000 
})

// ===============================
// 🔄 REACT QUERY OPTIMIZATION
// ===============================

// src/lib/query/optimized-client.ts - React Query Configuration
'use client'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - data is considered fresh for this duration
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time - how long inactive data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors except 429 (rate limit)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
          return false
        }
        return failureCount < 3
      },
      
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch settings
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      
      // Suspense mode for better UX
      throwOnError: false,