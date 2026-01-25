# 배포 가이드

프로덕션 배포 단계별 가이드.

## 1. 배포 플랫폼 선택

### 웹 앱 배포 (권장: Vercel)

| 플랫폼 | 장점 | 단점 |
|--------|------|------|
| **Vercel** | Next.js 최적화, 무료 플랜, 쉬운 설정 | 서버 기능 제한 |
| **Netlify** | 간편함, 무료 플랜 | Vercel보다 Next.js 지원 약함 |
| **AWS Amplify** | AWS 통합 | 설정 복잡 |
| **Railway** | 백엔드 포함 가능 | 무료 플랜 제한적 |

**MVP 추천**: Vercel (Next.js 앱) + Supabase (백엔드)

---

## 2. Vercel 배포 (웹 앱)

### 2.1. Vercel 계정 생성
1. https://vercel.com 접속
2. GitHub 계정으로 가입
3. GitHub repository 연결 권한 부여

### 2.2. 프로젝트 배포

#### GitHub 연동 (권장)
```bash
# Git repository 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 푸시
git remote add origin https://github.com/[username]/[repo-name].git
git push -u origin main
```

#### Vercel 배포
1. Vercel 대시보드에서 "New Project"
2. GitHub repository 선택
3. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. 환경 변수 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```
5. "Deploy" 클릭

### 2.3. 환경 변수 설정
```bash
# Vercel CLI 설치 (선택사항)
npm i -g vercel

# 로컬에서 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Vercel Dashboard에서 설정:
- Project Settings > Environment Variables
- Production, Preview, Development 환경별 설정 가능

### 2.4. 커스텀 도메인 (선택사항)
1. Project Settings > Domains
2. 도메인 추가 (예: myapp.com)
3. DNS 설정:
   - A Record: 76.76.21.21
   - CNAME: cname.vercel-dns.com

---

## 3. Supabase 프로덕션 설정

### 3.1. 프로덕션 프로젝트 생성
로컬 개발과 별도 프로젝트 권장:
- **개발**: 로컬 Supabase 또는 개발 프로젝트
- **프로덕션**: 별도 Supabase 프로젝트

### 3.2. 마이그레이션 적용
```bash
# 프로덕션 프로젝트에 연결
supabase link --project-ref [production-project-id]

# 마이그레이션 푸시
supabase db push
```

### 3.3. 프로덕션 환경 변수
Vercel에 프로덕션 Supabase URL/Key 설정:
```
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
```

### 3.4. Supabase 보안 설정
- Authentication > URL Configuration
  - Site URL: https://your-domain.com
  - Redirect URLs: 
    - https://your-domain.com/auth/callback
    - https://your-domain.vercel.app/auth/callback

---

## 4. 배포 체크리스트

### 배포 전 필수 확인
- [ ] 모든 환경 변수 설정 완료
- [ ] .env 파일이 .gitignore에 포함
- [ ] 프로덕션 빌드 로컬 테스트 (`npm run build`)
- [ ] TypeScript 에러 없음
- [ ] ESLint 에러 없음
- [ ] 테스트 통과 (있는 경우)

### Supabase 확인
- [ ] 모든 테이블에 RLS 활성화
- [ ] 마이그레이션 프로덕션 적용
- [ ] 백업 설정 (Supabase Dashboard)
- [ ] 프로덕션 URL/Key Vercel에 설정

### Vercel 확인
- [ ] 환경 변수 모두 설정
- [ ] 빌드 성공
- [ ] 배포 URL 접근 가능
- [ ] HTTPS 작동

### 기능 확인
- [ ] 회원가입/로그인 작동
- [ ] 주요 기능 동작
- [ ] 파일 업로드 작동 (있는 경우)
- [ ] OAuth 작동 (설정한 경우)

---

## 5. 배포 후 설정

### 5.1. 도메인 SSL 인증서
Vercel은 자동으로 Let's Encrypt SSL 발급
- 확인: https://your-domain.com (자물쇠 아이콘)

### 5.2. 모니터링 설정

#### Vercel Analytics (무료)
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### Sentry (에러 트래킹, 선택사항)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 5.3. 성능 모니터링
Vercel Dashboard에서 확인 가능:
- 응답 시간
- 배포 빈도
- 에러율

---

## 6. CI/CD 파이프라인 (자동 배포)

### GitHub Actions (선택사항)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Vercel 자동 배포 (기본)
- main 브랜치에 push하면 자동 배포
- PR 생성 시 Preview 배포 자동 생성

---

## 7. 모바일 앱 배포 (React Native)

### iOS (App Store)

#### 필요 사항
- Apple Developer Program 가입 ($99/년)
- macOS 컴퓨터
- Xcode

#### 배포 단계
```bash
# 1. 프로덕션 빌드
npx expo build:ios

# 2. App Store Connect에서 앱 등록
# - 앱 이름, 번들 ID, 카테고리 등

# 3. TestFlight 배포 (베타 테스트)
npx eas build --platform ios

# 4. App Store 제출
```

### Android (Google Play)

#### 필요 사항
- Google Play Console 계정 ($25 일회성)

#### 배포 단계
```bash
# 1. 프로덕션 빌드
npx expo build:android

# 2. Google Play Console에서 앱 등록

# 3. APK/AAB 업로드

# 4. 내부 테스트 → 공개 베타 → 프로덕션
```

---

## 8. 롤백 절차

### Vercel 롤백
1. Vercel Dashboard > Deployments
2. 이전 배포 선택
3. "Promote to Production" 클릭
4. 즉시 롤백 완료

### Supabase 롤백
```bash
# 마이그레이션 롤백 (신중히)
supabase migration repair [migration-version]
```

### 긴급 롤백 시
1. Vercel에서 이전 버전으로 롤백
2. 문제 원인 파악
3. 핫픽스 적용
4. 재배포

---

## 9. 배포 후 모니터링

### 주요 메트릭
- **Uptime**: 99.9% 목표
- **응답 시간**: < 1초
- **에러율**: < 0.1%

### 모니터링 도구
1. **Vercel Dashboard**: 기본 메트릭
2. **Supabase Dashboard**: DB 성능, API 사용량
3. **Google Analytics**: 사용자 행동 (선택사항)
4. **Sentry**: 에러 트래킹 (선택사항)

### 알림 설정
- Vercel: 배포 실패 시 이메일
- Supabase: 리소스 한계 도달 시 알림

---

## 10. 배포 문서 (DEPLOYMENT.md)

```markdown
# [프로젝트명] 배포 가이드

## 프로덕션 환경

### Frontend
- **URL**: https://your-domain.com
- **플랫폼**: Vercel
- **Repository**: https://github.com/[username]/[repo]

### Backend
- **Supabase Project**: [project-name]
- **Region**: Northeast Asia (Seoul)

## 환경 변수

### Vercel
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

## 배포 명령어

### 수동 배포
```bash
# Vercel CLI 배포
vercel --prod

# Supabase 마이그레이션
supabase db push
```

### 자동 배포
- main 브랜치에 push하면 자동 배포

## 롤백

### Vercel
1. Dashboard > Deployments
2. 이전 버전 선택
3. "Promote to Production"

### Supabase
```bash
supabase migration repair [version]
```

## 모니터링

- **Vercel Analytics**: https://vercel.com/[username]/[project]/analytics
- **Supabase Dashboard**: https://app.supabase.com/project/[id]

## 긴급 연락처

- **개발자**: [이메일]
- **Supabase 지원**: https://supabase.com/support
- **Vercel 지원**: https://vercel.com/support
```

---

## 11. 프로덕션 최적화 팁

### 이미지 최적화
```typescript
// Next.js Image 컴포넌트 사용
import Image from 'next/image'

<Image 
  src="/image.jpg" 
  alt="Description"
  width={500}
  height={300}
  loading="lazy"
/>
```

### 폰트 최적화
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

### Bundle 크기 최적화
```bash
# 번들 분석
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // config
})

# 실행
ANALYZE=true npm run build
```

---

## 12. 보안 체크리스트

- [ ] HTTPS 강제
- [ ] 환경 변수 안전하게 관리 (절대 커밋 금지)
- [ ] API 키 노출 확인 (클라이언트 소스코드)
- [ ] CORS 설정 확인
- [ ] RLS 정책 모든 테이블 활성화
- [ ] Rate limiting 고려
- [ ] XSS, CSRF 방어
- [ ] 민감한 console.log 제거

---

## 13. 비용 관리

### Supabase 무료 플랜 한도
- **Database**: 500MB
- **Storage**: 1GB
- **Bandwidth**: 2GB
- **Edge Functions**: 500K invocations/month

### Vercel 무료 플랜 한도
- **Bandwidth**: 100GB/month
- **Builds**: 6000 minutes/month
- **Serverless Functions**: 100GB-Hours

### 비용 절감 팁
1. 이미지 압축 (bandwidth 절약)
2. 캐싱 활용
3. 불필요한 API 호출 최소화
4. 효율적인 쿼리 작성

---

## 배포 후 할 일

1. [ ] 배포 URL 사용자에게 공유
2. [ ] 소셜 미디어 공유 (OG 이미지 확인)
3. [ ] Google Search Console 등록 (SEO)
4. [ ] Google Analytics 설정 (선택사항)
5. [ ] 피드백 수집 채널 마련
6. [ ] 버그 리포트 모니터링
7. [ ] 사용자 행동 분석
8. [ ] 다음 버전 계획
