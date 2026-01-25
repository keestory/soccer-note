# Supabase 설정 가이드

Supabase 프로젝트 생성부터 배포까지 단계별 가이드.

## 1. Supabase 프로젝트 생성

### 웹 콘솔에서 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. 프로젝트 정보 입력
   - **Name**: 프로젝트명
   - **Database Password**: 강력한 비밀번호 (저장!)
   - **Region**: Northeast Asia (Seoul) 권장
4. 프로젝트 생성 대기 (1-2분)

### 프로젝트 정보 확인
```
Project Settings > API
- Project URL: https://[project-id].supabase.co
- anon public: [anon-key]
- service_role: [service-key] (주의: 비공개)
```

---

## 2. 로컬 개발 환경 설정 (권장)

### Supabase CLI 설치
```bash
# macOS
brew install supabase/tap/supabase

# Linux/WSL
brew install supabase/tap/supabase

# npm (모든 플랫폼)
npm install -g supabase
```

### 프로젝트 초기화
```bash
# 프로젝트 루트에서
supabase init

# Docker로 로컬 Supabase 시작
supabase start

# 결과 확인
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
```

### 로컬 vs 클라우드
| 방식 | 장점 | 단점 |
|------|------|------|
| 로컬 | 빠른 개발, 무료, 오프라인 가능 | Docker 필요 |
| 클라우드 | 설정 간편, 즉시 사용 | 무료 플랜 제한 |

**권장**: 로컬 개발 → 클라우드 배포

---

## 3. 데이터베이스 마이그레이션

### 마이그레이션 파일 생성
```bash
supabase migration new initial_schema
```

파일 위치: `supabase/migrations/[timestamp]_initial_schema.sql`

### 예시: 초기 스키마
```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 마이그레이션 실행
```bash
# 로컬
supabase db reset

# 클라우드에 푸시
supabase db push
```

---

## 4. Row Level Security (RLS) 설정

### RLS 기본 개념
```sql
-- RLS 활성화 (필수!)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 정책이 없으면 모든 접근 차단됨
-- 명시적으로 허용되는 것만 접근 가능
```

### 일반적인 RLS 패턴

#### 1. 본인 데이터만 접근
```sql
CREATE POLICY "Users can CRUD own data"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 2. 공개 읽기, 본인만 쓰기
```sql
CREATE POLICY "Public read access"
  ON table_name FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3. 공개 여부 플래그 기반
```sql
CREATE POLICY "Public content is viewable"
  ON posts FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);
```

### RLS 디버깅
```sql
-- RLS 일시 비활성화 (테스트용)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

---

## 5. Storage 설정 (파일 업로드)

### 버킷 생성
```sql
-- Storage > Create bucket
-- 또는 SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

### Storage RLS 정책
```sql
-- 업로드 정책
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 조회 정책
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 삭제 정책
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 클라이언트 사용법
```typescript
// 파일 업로드
const file = event.target.files[0]
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/${file.name}`, file)

// 공개 URL 가져오기
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/${file.name}`)

console.log(data.publicUrl)
```

---

## 6. Edge Functions (선택사항)

### Edge Function 생성
```bash
supabase functions new my-function
```

### 예시: AI 추천 함수
```typescript
// supabase/functions/ai-recommend/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 인증 확인
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // 비즈니스 로직
    const { userId } = await req.json()
    
    // 사용자 데이터 조회
    const { data: userData } = await supabaseClient
      .from('table_name')
      .select('*')
      .eq('user_id', userId)

    // AI 추천 로직 (예시)
    const recommendations = await generateRecommendations(userData)

    return new Response(
      JSON.stringify({ data: recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Edge Function 배포
```bash
# 로컬 테스트
supabase functions serve my-function

# 배포
supabase functions deploy my-function
```

### 환경 변수 설정
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## 7. 인증 설정

### Email/Password 인증
기본적으로 활성화됨. 추가 설정 불필요.

### OAuth 설정 (Google 예시)
1. Google Cloud Console에서 OAuth 클라이언트 생성
2. Supabase Dashboard > Authentication > Providers
3. Google 활성화, Client ID/Secret 입력
4. Redirect URL 설정: `https://[project-id].supabase.co/auth/v1/callback`

### 클라이언트 사용
```typescript
// Email/Password 회원가입
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      display_name: 'John Doe'
    }
  }
})

// Email/Password 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// OAuth 로그인
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})

// 로그아웃
await supabase.auth.signOut()

// 현재 사용자 확인
const { data: { user } } = await supabase.auth.getUser()
```

---

## 8. 환경 변수 설정

### Next.js 프로젝트
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 서버 사이드 전용 (Optional)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase 클라이언트 초기화
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 9. 데이터베이스 시딩 (선택사항)

### Seed 파일 작성
```sql
-- supabase/seed.sql

-- 테스트 사용자 (개발 환경)
INSERT INTO profiles (id, email, display_name)
VALUES 
  ('user-uuid-1', 'test1@example.com', 'Test User 1'),
  ('user-uuid-2', 'test2@example.com', 'Test User 2');

-- 샘플 데이터
INSERT INTO posts (user_id, title, content)
VALUES 
  ('user-uuid-1', 'First Post', 'Hello World'),
  ('user-uuid-1', 'Second Post', 'Testing');
```

### Seed 실행
```bash
supabase db reset --db-url [connection-string]
```

---

## 10. 유용한 SQL 쿼리

### 모든 테이블 조회
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public';
```

### 테이블 구조 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'your_table';
```

### RLS 정책 확인
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'your_table';
```

### 인덱스 확인
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'your_table';
```

---

## 11. Troubleshooting

### 문제: RLS 정책이 작동하지 않음
```sql
-- 1. RLS가 활성화되었는지 확인
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'your_table';

-- 2. 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- 3. 임시 비활성화 테스트
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

### 문제: 마이그레이션 충돌
```bash
# 로컬 DB 리셋
supabase db reset

# 특정 마이그레이션 롤백
supabase migration rollback [migration-name]
```

### 문제: Edge Function 오류
```bash
# 로그 확인
supabase functions logs my-function

# 로컬에서 디버깅
supabase functions serve my-function --debug
```

---

## 12. 프로덕션 체크리스트

- [ ] 모든 테이블에 RLS 활성화
- [ ] 민감한 정보 암호화
- [ ] 환경 변수 안전하게 관리
- [ ] 인덱스 최적화 (자주 쿼리하는 컬럼)
- [ ] 백업 설정 (Supabase 대시보드)
- [ ] Rate limiting 고려
- [ ] 프로덕션 환경 변수 설정
- [ ] 마이그레이션 테스트

---

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions 가이드](https://supabase.com/docs/guides/functions)
