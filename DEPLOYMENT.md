# SoccerNote - 배포 가이드

## 1. 사전 준비

### 필수 계정
- [Supabase](https://supabase.com) 계정
- [Vercel](https://vercel.com) 계정 (또는 GitHub 계정)

---

## 2. Supabase 설정

### 2.1 프로젝트 생성
1. Supabase 대시보드에서 "New Project" 클릭
2. 프로젝트 이름, 데이터베이스 비밀번호, 리전 설정
3. 프로젝트 생성 완료까지 대기 (2-3분)

### 2.2 데이터베이스 마이그레이션
1. Supabase Dashboard > SQL Editor 이동
2. `supabase/migrations/001_initial_schema.sql` 내용 복사
3. SQL Editor에 붙여넣기 후 "Run" 클릭
4. 모든 테이블과 정책이 생성되었는지 확인

### 2.3 인증 설정
1. Authentication > Providers 이동
2. Email 활성화 확인
3. (선택) 이메일 확인 비활성화: Auth Settings > "Enable email confirmations" 끄기

### 2.4 API 키 복사
1. Project Settings > API 이동
2. 다음 값들을 복사하여 보관:
   - `Project URL`
   - `anon public` key

---

## 3. 로컬 개발 환경 설정

### 3.1 의존성 설치
```bash
# npm 캐시 권한 문제 해결 (필요시)
sudo chown -R $(whoami) ~/.npm

# 의존성 설치
npm install
```

### 3.2 환경 변수 설정
```bash
# .env.local.example을 복사
cp .env.local.example .env.local

# .env.local 파일 편집하여 Supabase 값 입력
```

`.env.local` 내용:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3.3 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 에서 확인

---

## 4. Vercel 배포

### 4.1 GitHub 연결
1. 프로젝트를 GitHub 리포지토리에 푸시
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/soccer-note.git
git push -u origin main
```

### 4.2 Vercel 프로젝트 생성
1. [Vercel Dashboard](https://vercel.com/dashboard) 이동
2. "Add New..." > "Project" 클릭
3. GitHub 리포지토리 선택

### 4.3 환경 변수 설정
1. "Environment Variables" 섹션에서 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase Anon Key

### 4.4 배포
1. "Deploy" 클릭
2. 빌드 및 배포 완료 대기 (2-3분)
3. 제공된 URL로 접속하여 확인

---

## 5. 배포 후 확인사항

### 5.1 기본 기능 테스트
- [ ] 회원가입 동작
- [ ] 로그인 동작
- [ ] 팀 생성
- [ ] 선수 추가
- [ ] 경기 생성
- [ ] 쿼터 편집 (드래그 앤 드롭)
- [ ] MVP 표시

### 5.2 Supabase 연동 확인
- [ ] 데이터베이스 테이블에 데이터 저장 확인
- [ ] RLS 정책 동작 확인

---

## 6. 커스텀 도메인 설정 (선택)

### Vercel에서 도메인 연결
1. Project Settings > Domains 이동
2. 도메인 입력 및 추가
3. DNS 레코드 설정 (안내에 따라)

### Supabase URL 업데이트
1. Supabase Dashboard > Authentication > URL Configuration
2. Site URL에 커스텀 도메인 추가

---

## 7. 문제 해결

### 빌드 오류
- 환경 변수가 올바르게 설정되었는지 확인
- TypeScript 타입 오류 확인: `npm run build`

### 인증 오류
- Supabase Dashboard에서 Auth 설정 확인
- 환경 변수 URL 형식 확인 (https:// 포함)

### 데이터 접근 오류
- RLS 정책이 올바르게 적용되었는지 확인
- Supabase Dashboard > Authentication > Users에서 사용자 확인

---

## 8. 모니터링 및 유지보수

### Vercel Analytics
- Vercel Dashboard에서 트래픽 및 성능 모니터링

### Supabase Monitoring
- Dashboard > Reports에서 데이터베이스 사용량 확인
- Auth > Users에서 사용자 관리

### 로그 확인
- Vercel: Functions 탭에서 로그 확인
- Supabase: Database > Logs에서 쿼리 로그 확인

---

## 9. 환경 변수 체크리스트

| 변수명 | 필수 | 설명 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | O | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | O | Supabase 익명 키 |

---

## 10. 롤백 절차

### Vercel 롤백
1. Deployments 탭 이동
2. 이전 성공한 배포 선택
3. "..." 메뉴 > "Promote to Production" 클릭

### 데이터베이스 롤백
- Supabase 백업에서 복원 (Pro 플랜 필요)
- 또는 수동으로 SQL 롤백 스크립트 실행
