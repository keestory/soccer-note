import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR, Bebas_Neue } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-sans',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SoccerNote - 축구팀 경기 기록',
  description: '축구팀 경기 결과와 선수 평가를 기록하고 MVP를 선정하세요',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f6f8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${bebasNeue.variable}`}>
      <body className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: '#fff' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
