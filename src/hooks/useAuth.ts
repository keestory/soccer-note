'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// 인증 정보 메모리 캐시
let cachedUser: User | null = null
let lastAuthCheck = 0
const AUTH_CACHE_DURATION = 30 * 1000 // 30초

/**
 * 인증 정보를 캐싱하여 빠르게 반환하는 훅
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const now = Date.now()

      // 캐시가 유효하면 사용
      if (cachedUser && now - lastAuthCheck < AUTH_CACHE_DURATION) {
        setUser(cachedUser)
        setLoading(false)
        return
      }

      // 새로 fetch
      const { data: { user: fetchedUser } } = await supabase.auth.getUser()
      cachedUser = fetchedUser
      lastAuthCheck = now
      setUser(fetchedUser)
      setLoading(false)
    }

    checkAuth()

    // Auth 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user || null
      lastAuthCheck = Date.now()
      setUser(cachedUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

/**
 * 인증 캐시 무효화
 */
export function invalidateAuthCache() {
  cachedUser = null
  lastAuthCheck = 0
}
