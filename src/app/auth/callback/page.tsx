'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { exchangeAndEnsureProfile } from '@/lib/auth-exchange'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      // Read params from the URL directly (avoids useSearchParams Suspense need)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = params.get('next') || '/dashboard'
      const errorDescription = params.get('error_description')

      if (errorDescription) {
        setError(errorDescription)
        return
      }
      if (!code) {
        setError('유효하지 않은 인증 링크입니다.')
        return
      }

      const supabase = createClient()
      const { error } = await exchangeAndEnsureProfile(supabase, code)
      if (error) {
        setError(error.message)
        return
      }

      router.replace(next)
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {error ? (
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">인증에 실패했습니다</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">인증을 처리하고 있습니다...</p>
        </div>
      )}
    </div>
  )
}
