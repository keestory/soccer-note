'use client'

import { useEffect } from 'react'
import { loadAppData } from '@/lib/dataStore'

/**
 * 앱 시작 시 데이터를 미리 로드하는 프로바이더
 * - 백그라운드에서 인증 + 팀 데이터 로드
 * - 각 페이지에서 캐시된 데이터 즉시 사용 가능
 */
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 앱 시작 시 데이터 프리로드
    loadAppData()
  }, [])

  return <>{children}</>
}
