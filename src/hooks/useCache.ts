'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// 메모리 캐시 (앱 실행 중 유지)
const memoryCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5분

// localStorage 캐시 키
const STORAGE_PREFIX = 'soccer_cache_'

interface CacheOptions {
  /** 캐시 지속 시간 (ms) */
  duration?: number
  /** localStorage에도 저장할지 */
  persist?: boolean
}

/**
 * 데이터를 캐싱하고 즉시 반환하는 훅
 * - 캐시된 데이터가 있으면 즉시 반환 (0.01초)
 * - 백그라운드에서 새 데이터 fetch
 * - 새 데이터가 오면 자동 업데이트
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const { duration = CACHE_DURATION, persist = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // 캐시에서 데이터 읽기
  const getCachedData = useCallback((): T | null => {
    // 1. 메모리 캐시 확인
    const memCached = memoryCache.get(key)
    if (memCached && Date.now() - memCached.timestamp < duration) {
      return memCached.data as T
    }

    // 2. localStorage 캐시 확인
    if (persist && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Date.now() - parsed.timestamp < duration) {
            // 메모리 캐시에도 저장
            memoryCache.set(key, parsed)
            return parsed.data as T
          }
        }
      } catch (e) {
        // localStorage 에러 무시
      }
    }

    return null
  }, [key, duration, persist])

  // 캐시에 데이터 저장
  const setCachedData = useCallback((newData: T) => {
    const cacheEntry = { data: newData, timestamp: Date.now() }

    // 메모리 캐시 저장
    memoryCache.set(key, cacheEntry)

    // localStorage 저장
    if (persist && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(cacheEntry))
      } catch (e) {
        // localStorage 용량 초과 등 에러 무시
      }
    }
  }, [key, persist])

  // 데이터 fetch
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }

    try {
      const newData = await fetcherRef.current()
      setData(newData)
      setCachedData(newData)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setCachedData])

  // 초기 로드
  useEffect(() => {
    // 캐시된 데이터 즉시 반환
    const cached = getCachedData()
    if (cached) {
      setData(cached)
      setLoading(false)
      // 백그라운드에서 새 데이터 fetch
      fetchData(true)
    } else {
      // 캐시 없으면 바로 fetch
      fetchData(false)
    }
  }, [key]) // key가 변경되면 다시 fetch

  // 수동 새로고침
  const refresh = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return { data, loading, refreshing, error, refresh }
}

/**
 * 캐시 무효화
 */
export function invalidateCache(key: string) {
  memoryCache.delete(key)
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_PREFIX + key)
  }
}

/**
 * 특정 패턴의 캐시 모두 무효화
 */
export function invalidateCachePattern(pattern: string) {
  // 메모리 캐시
  const keysToDelete: string[] = []
  memoryCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => memoryCache.delete(key))

  // localStorage
  if (typeof window !== 'undefined') {
    const storageKeysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX) && key.includes(pattern)) {
        storageKeysToDelete.push(key)
      }
    }
    storageKeysToDelete.forEach(key => localStorage.removeItem(key))
  }
}

/**
 * 전역 데이터 스토어 (팀 정보 등 자주 사용되는 데이터)
 */
interface GlobalStore {
  currentTeamId: string | null
  currentUserId: string | null
  teams: unknown[] | null
}

const globalStore: GlobalStore = {
  currentTeamId: null,
  currentUserId: null,
  teams: null
}

export function setGlobalStore<K extends keyof GlobalStore>(key: K, value: GlobalStore[K]) {
  globalStore[key] = value
}

export function getGlobalStore<K extends keyof GlobalStore>(key: K): GlobalStore[K] {
  return globalStore[key]
}
