import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoccerNote - 축구팀 경기 기록',
  description: '축구팀 경기 결과와 선수 평가를 기록하고 MVP를 선정하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
