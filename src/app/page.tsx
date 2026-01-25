'use client'

import Link from 'next/link'
import { Trophy, Users, Star, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700">
      {/* Header */}
      <header className="p-4 flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white">SoccerNote</h1>
        <Link
          href="/login"
          className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-medium hover:bg-gray-100 transition"
        >
          로그인
        </Link>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-32">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            축구팀 경기 기록의 모든 것
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            쿼터별 선수 평가, 포메이션 배치, 자동 MVP 선정까지
            <br />
            감독님의 팀 관리를 도와드립니다
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="포메이션 배치"
            description="드래그 앤 드롭으로 쿼터별 포메이션을 시각적으로 구성하세요"
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8" />}
            title="쿼터별 기록"
            description="각 쿼터마다 선수별 점수와 골, 어시스트를 기록하세요"
          />
          <FeatureCard
            icon={<Star className="w-8 h-8" />}
            title="자동 MVP 선정"
            description="모든 쿼터 평균 점수로 객관적인 MVP를 자동 선정합니다"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-200 py-8 text-center">
        <p>&copy; 2024 SoccerNote. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
      <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-emerald-100">{description}</p>
    </div>
  )
}
