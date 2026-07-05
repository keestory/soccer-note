'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Onboarding() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col safe-top safe-bottom"
      style={{ background: '#0a0a0a' }}
    >
      {/* Center content */}
      <div className="flex-1 flex flex-col justify-center px-8">
        {/* Logo */}
        <div
          className="mb-7 flex items-center justify-center font-display text-[44px]"
          style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'var(--accent)', color: '#0a0a0a',
          }}
        >
          S
        </div>

        {/* Headline */}
        <div
          className="font-display text-[44px] text-white leading-[.95] mb-3"
          style={{ letterSpacing: '0.03em' }}
        >
          우리 팀<br />경기의 모든 것
        </div>

        {/* Subtext */}
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted2)' }}>
          포메이션 · 쿼터별 평점 · 자동 MVP<br />
          매칭까지, 아마추어 축구의 모든 기록.
        </p>

        {/* Feature chips */}
        <div className="flex gap-2 mt-7 flex-wrap">
          {['⚽ 포메이션', '★ MVP', '⚔ 매칭'].map(label => (
            <span
              key={label}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'var(--chip)', color: 'var(--chipText)' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="px-8 pb-10 flex flex-col gap-3">
        <button
          onClick={() => router.push('/login')}
          className="w-full py-4 rounded-[14px] font-black text-[16px] transition active:scale-[0.98]"
          style={{ background: 'var(--accent)', color: '#0a0a0a' }}
        >
          시작하기
        </button>
        <Link
          href="/login"
          className="block w-full py-3.5 rounded-[14px] font-bold text-[14px] text-center text-white transition active:scale-[0.98]"
          style={{ border: '1px solid #2a2a2a' }}
        >
          이미 계정이 있어요
        </Link>
      </div>
    </div>
  )
}
