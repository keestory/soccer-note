# 시스템 설계 템플릿 (SYSTEM_DESIGN.md)

Supabase 기반 시스템 아키텍처를 명확히 정의한다.

## 템플릿 구조

```markdown
# [프로젝트명] - 시스템 설계 문서

## 1. 아키텍처 개요

### 시스템 구성
```
┌─────────────┐
│   클라이언트  │ (Next.js)
│   (Browser)  │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────┐
│  Supabase   │
│  ┌────────┐ │
│  │PostgRES│ │ (Database + RLS)
│  │   QL   │ │
│  └────────┘ │
│  ┌────────┐ │
│  │  Auth  │ │ (Authentication)
│  └────────┘ │
│  ┌────────┐ │
│  │ Storage│ │ (File Storage)
│  └────────┘ │
│  ┌────────┐ │
│  │  Edge  │ │ (Serverless Functions)
│  │  Funcs │ │
│  └────────┘ │
└─────────────┘
```

### 인증 전략
- **방식**: [Email/Password, Google OAuth, etc.]
- **세션 관리**: JWT tokens
- **보안**: Row Level Security (RLS)

---

## 2. 데이터베이스 스키마

### ERD
```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  users   │──1:M──│  posts   │──1:M──│ comments │
│  (auth)  │       │          │       │          │
└──────────┘       └──────────┘       └──────────┘
```

### 테이블 정의

#### users (Supabase Auth 자동 생성)
```sql
-- auth.users 테이블 사용 (Supabase 기본)
-- 추가 프로필 정보는 profiles 테이블에 저장
```

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### [주요 엔티티 1]
```sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  [column_name] [TYPE] [CONSTRAINTS],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_[table_name]_user_id ON [table_name](user_id);
CREATE INDEX idx_[table_name]_created_at ON [table_name](created_at DESC);

-- RLS 정책
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own [table_name]"
  ON [table_name] FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own [table_name]"
  ON [table_name] FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own [table_name]"
  ON [table_name] FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own [table_name]"
  ON [table_name] FOR DELETE
  USING (auth.uid() = user_id);
```

### 관계 정의
- **users ↔ profiles**: 1:1
- **users ↔ [table_name]**: 1:Many
- **[table_name] ↔ [related_table]**: Many:Many (junction table 사용)

---

## 3. API 설계

### Supabase 자동 생성 API (PostgREST)

#### 기본 CRUD
```typescript
// SELECT
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);

// INSERT
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: value });

// UPDATE
const { data, error } = await supabase
  .from('table_name')
  .update({ column: value })
  .eq('id', id);

// DELETE
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

### Edge Functions (커스텀 로직)

#### Function 1: [function_name]
```typescript
// supabase/functions/[function-name]/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 인증 확인
  const authHeader = req.headers.get('Authorization')!
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 로직 실행
  const { param } = await req.json()
  
  // 비즈니스 로직
  const result = await doSomething(param)

  return new Response(
    JSON.stringify({ data: result }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

**사용 예시**:
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param: value }
})
```

---

## 4. 인증 및 권한 정책

### 인증 플로우
```
1. 회원가입/로그인
   ↓
2. JWT 토큰 발급 (Supabase Auth)
   ↓
3. 토큰을 헤더에 포함하여 API 요청
   ↓
4. RLS 정책이 자동으로 권한 확인
   ↓
5. 허가된 데이터만 반환
```

### RLS 정책 패턴

#### 1. 본인 데이터만 접근
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);
```

#### 2. 공개 읽기, 본인만 쓰기
```sql
CREATE POLICY "Anyone can read"
  ON table_name FOR SELECT
  USING (true);

CREATE POLICY "Users can create own"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### 3. 팀/그룹 기반 접근
```sql
CREATE POLICY "Team members can access"
  ON table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = table_name.team_id
      AND user_id = auth.uid()
    )
  );
```

---

## 5. 파일 스토리지 (필요시)

### 버킷 설정
```sql
-- Storage bucket 생성 (Supabase Dashboard)
-- 이름: avatars, documents, images 등

-- RLS 정책
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 사용 예시
```typescript
// 파일 업로드
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file)

// 파일 URL 가져오기
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`)
```

---

## 6. 실시간 기능 (선택사항)

### Realtime 구독
```typescript
// 테이블 변경사항 실시간 구독
const channel = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'table_name'
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// 구독 해제
channel.unsubscribe()
```

---

## 7. 마이그레이션 전략

### 초기 마이그레이션
```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE profiles (
  ...
);

CREATE TABLE [table_name] (
  ...
);

-- Create indexes
CREATE INDEX ...;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY ...;

-- Create functions (if needed)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 마이그레이션 실행
```bash
# 로컬 개발
supabase db reset

# 프로덕션
supabase db push
```

---

## 8. 성능 최적화

### 인덱싱 전략
- `user_id`: 대부분의 쿼리에서 필터링
- `created_at`: 정렬 및 페이지네이션
- 자주 검색하는 컬럼: Full-text search 인덱스

### 쿼리 최적화
```typescript
// Bad: N+1 쿼리
const posts = await supabase.from('posts').select('*')
for (const post of posts) {
  const author = await supabase
    .from('profiles')
    .select('*')
    .eq('id', post.user_id)
}

// Good: JOIN으로 한 번에
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    profiles:user_id (
      display_name,
      avatar_url
    )
  `)
```

---

## 9. 보안 체크리스트

- [ ] 모든 테이블에 RLS 활성화
- [ ] 민감한 정보 암호화 (필요시)
- [ ] API 키를 환경 변수로 관리
- [ ] CORS 설정 확인
- [ ] Rate limiting 고려 (프로덕션)
- [ ] SQL Injection 방지 (Prepared statements)
- [ ] XSS 방지 (입력 검증)

---

## 10. 환경 변수

### 필수 환경 변수
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (서버용)
```

### Supabase 프로젝트 정보
- **Project URL**: https://[project-id].supabase.co
- **API Keys**: Project Settings > API
```

## 작성 가이드

### 데이터베이스 설계 원칙
1. **정규화**: 중복 데이터 최소화
2. **명명 규칙**: snake_case 사용
3. **타임스탬프**: created_at, updated_at 필수
4. **외래키**: ON DELETE CASCADE 고려
5. **인덱스**: 자주 쿼리하는 컬럼

### RLS 정책 작성 팁
- 기본은 모든 접근 차단
- 명시적으로 허용되는 것만 POLICY로 정의
- 테스트 시 정책 비활성화 후 확인 가능

### 마이그레이션 베스트 프랙티스
- 각 마이그레이션은 되돌릴 수 있어야 함
- 파일명에 순서 번호 포함 (001, 002, ...)
- 운영 DB에 적용 전 로컬에서 충분히 테스트
