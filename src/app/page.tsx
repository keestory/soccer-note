'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import {
  Star, ArrowRight, BarChart3,
  Layout, ClipboardList, ArrowLeftRight, Shield, ChevronDown
} from 'lucide-react'

const FEATURES = [
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: '팀 전적 대시보드',
    description: '총 경기 수, 승/패/무, 승률을 한눈에 확인하세요. 최근 경기 결과와 MVP까지 대시보드에서 바로 볼 수 있습니다.',
    image: '/screenshots/dashboard.png',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: <Layout className="w-6 h-6" />,
    title: '포메이션 배치',
    description: '축구장 위에 선수를 드래그하여 쿼터별 포메이션을 시각적으로 구성하세요. 4-3-3, 4-4-2 등 프리셋도 지원합니다.',
    image: '/screenshots/formation.png',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    title: '쿼터별 기록 & 평가',
    description: '각 쿼터마다 선수별 점수(1~10), 골, 어시스트, 클린시트를 기록하세요. 필드 위에서 바로 스탯을 확인할 수 있습니다.',
    image: '/screenshots/quarter.png',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: <ArrowLeftRight className="w-6 h-6" />,
    title: '선수 교체 기록',
    description: '쿼터 내 교체 시점과 IN/OUT 선수를 기록하세요. 필드 위에 교체 마커가 표시되어 한눈에 파악할 수 있습니다.',
    image: '/screenshots/substitution_01.png',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: '자동 MVP 선정',
    description: '전 쿼터 평균 점수를 기반으로 객관적인 MVP를 자동 선정합니다. 경기 목록에서 각 경기의 MVP를 바로 확인하세요.',
    image: '/screenshots/mvp.png',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: '팀원 권한 관리',
    description: '초대 코드로 팀원을 초대하고, 경기 편집/선수 편집/쿼터 편집 권한을 개별 부여하세요. 감독과 팀원의 역할을 분리합니다.',
    image: '/screenshots/members.png',
    color: 'from-rose-500 to-rose-600',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-emerald-600">SoccerNote</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-emerald-700 font-medium hover:bg-emerald-50 rounded-lg transition"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-emerald-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)',
          }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            축구팀 경기 기록의<br />모든 것
          </h2>
          <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            쿼터별 선수 평가, 포메이션 배치, 자동 MVP 선정까지
            <br />
            감독님의 팀 관리를 도와드립니다
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="mt-12 flex justify-center">
            <ChevronDown className="w-8 h-8 text-emerald-300 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">주요 기능</h3>
          <p className="text-gray-500 text-lg">팀 관리에 필요한 모든 기능을 제공합니다</p>
        </div>

        <div className="space-y-24">
          {FEATURES.map((feature, index) => (
            <FeatureSection
              key={index}
              {...feature}
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h3>
          <p className="text-emerald-200 text-lg mb-8">
            무료로 팀을 만들고 첫 경기를 기록해보세요
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; 2026 SoccerNote. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureSection({
  icon,
  title,
  description,
  image,
  color,
  reverse,
}: {
  icon: React.ReactNode
  title: string
  description: string
  image: string
  color: string
  reverse: boolean
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}>
      {/* Text */}
      <div className="flex-1 max-w-lg">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white mb-4`}>
          {icon}
        </div>
        <h4 className="text-2xl font-bold text-gray-900 mb-3">{title}</h4>
        <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
      </div>

      {/* Image */}
      <div className="flex-1 max-w-md w-full">
        {!imgError ? (
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
            <Image
              src={image}
              alt={title}
              width={400}
              height={700}
              className="w-full h-auto"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className={`rounded-2xl bg-gradient-to-br ${color} p-8 aspect-[9/16] max-h-[500px] flex flex-col items-center justify-center text-white/80`}>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              {icon}
            </div>
            <p className="text-white font-semibold text-lg">{title}</p>
            <p className="text-white/60 text-sm mt-2">스크린샷 준비 중</p>
          </div>
        )}
      </div>
    </div>
  )
}
