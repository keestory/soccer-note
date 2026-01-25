# SoccerNote - 시스템 설계 문서

## 1. 아키텍처 개요

### 시스템 구성
```
┌─────────────────┐
│   클라이언트     │ (Next.js 14 + Tailwind)
│   (Browser)     │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│    Supabase     │
│  ┌───────────┐  │
│  │PostgreSQL │  │ (Database + RLS)
│  └───────────┘  │
│  ┌───────────┐  │
│  │   Auth    │  │ (Email Authentication)
│  └───────────┘  │
└─────────────────┘
```

### 인증 전략
- **방식**: Email/Password
- **세션 관리**: JWT tokens (Supabase Auth)
- **보안**: Row Level Security (RLS)

---

## 2. 데이터베이스 스키마

### ERD
```
┌──────────┐
│  users   │ (auth.users - Supabase)
└────┬─────┘
     │ 1:1
     ↓
┌──────────┐       ┌──────────┐
│ profiles │───1:N─│  teams   │
└──────────┘       └────┬─────┘
                        │ 1:N
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌──────────┐     ┌──────────┐    ┌──────────┐
│ players  │     │ matches  │    │ (향후)    │
└────┬─────┘     └────┬─────┘    └──────────┘
     │                │ 1:N
     │           ┌────┴────┐
     │           ↓         ↓
     │    ┌──────────┐
     │    │ quarters │
     │    └────┬─────┘
     │         │ 1:N
     │         ↓
     └────►┌────────────────┐
           │ quarter_records│
           └────────────────┘
```

### 테이블 정의

#### profiles (사용자 프로필)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### teams (팀)
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_teams_user_id ON teams(user_id);

-- RLS 정책
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own teams"
  ON teams FOR ALL
  USING (auth.uid() = user_id);
```

#### players (선수)
```sql
CREATE TYPE position_type AS ENUM ('GK', 'DF', 'MF', 'FW');

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER,
  default_position position_type DEFAULT 'MF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_players_team_id ON players(team_id);

-- RLS 정책
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD players of own teams"
  ON players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  );
```

#### matches (경기)
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  match_date DATE NOT NULL,
  location TEXT,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_match_date ON matches(match_date DESC);

-- RLS 정책
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD matches of own teams"
  ON matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.user_id = auth.uid()
    )
  );
```

#### quarters (쿼터)
```sql
CREATE TABLE quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  quarter_number INTEGER NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  duration_minutes INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, quarter_number)
);

-- 인덱스
CREATE INDEX idx_quarters_match_id ON quarters(match_id);

-- RLS 정책
ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD quarters of own matches"
  ON quarters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      JOIN teams ON teams.id = matches.team_id
      WHERE matches.id = quarters.match_id
      AND teams.user_id = auth.uid()
    )
  );
```

#### quarter_records (쿼터별 선수 기록)
```sql
CREATE TABLE quarter_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- 포지션 정보 (필드 내 위치)
  position_type position_type NOT NULL,
  position_x DECIMAL(5,2) NOT NULL CHECK (position_x BETWEEN 0 AND 100),
  position_y DECIMAL(5,2) NOT NULL CHECK (position_y BETWEEN 0 AND 100),

  -- 평가 점수 (0.0 ~ 10.0)
  rating DECIMAL(3,1) CHECK (rating BETWEEN 0 AND 10),

  -- 통계
  goals INTEGER DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER DEFAULT 0 CHECK (assists >= 0),
  clean_sheet BOOLEAN DEFAULT FALSE,
  contribution DECIMAL(3,1) DEFAULT 0 CHECK (contribution BETWEEN 0 AND 10),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter_id, player_id)
);

-- 인덱스
CREATE INDEX idx_quarter_records_quarter_id ON quarter_records(quarter_id);
CREATE INDEX idx_quarter_records_player_id ON quarter_records(player_id);

-- RLS 정책
ALTER TABLE quarter_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD quarter_records of own matches"
  ON quarter_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quarters
      JOIN matches ON matches.id = quarters.match_id
      JOIN teams ON teams.id = matches.team_id
      WHERE quarters.id = quarter_records.quarter_id
      AND teams.user_id = auth.uid()
    )
  );
```

### 관계 정의
- **users ↔ profiles**: 1:1
- **users ↔ teams**: 1:N (한 사용자가 여러 팀 관리 가능)
- **teams ↔ players**: 1:N
- **teams ↔ matches**: 1:N
- **matches ↔ quarters**: 1:N (항상 4개)
- **quarters ↔ quarter_records**: 1:N (최대 11개, 11명)
- **players ↔ quarter_records**: 1:N

---

## 3. API 설계

### Supabase 자동 생성 API (PostgREST)

#### 팀 CRUD
```typescript
// 팀 목록 조회
const { data: teams } = await supabase
  .from('teams')
  .select('*')
  .order('created_at', { ascending: false });

// 팀 생성
const { data: team } = await supabase
  .from('teams')
  .insert({ name: '우리팀', user_id: userId })
  .select()
  .single();

// 팀 수정
const { data } = await supabase
  .from('teams')
  .update({ name: '새이름' })
  .eq('id', teamId);

// 팀 삭제
const { error } = await supabase
  .from('teams')
  .delete()
  .eq('id', teamId);
```

#### 선수 관리
```typescript
// 팀의 선수 목록 조회
const { data: players } = await supabase
  .from('players')
  .select('*')
  .eq('team_id', teamId)
  .order('number');

// 선수 추가
const { data: player } = await supabase
  .from('players')
  .insert({
    team_id: teamId,
    name: '홍길동',
    number: 10,
    default_position: 'FW'
  })
  .select()
  .single();
```

#### 경기 및 쿼터 조회
```typescript
// 경기 목록 (팀별)
const { data: matches } = await supabase
  .from('matches')
  .select(`
    *,
    quarters (
      id,
      quarter_number,
      quarter_records (
        *,
        player:players (id, name, number)
      )
    )
  `)
  .eq('team_id', teamId)
  .order('match_date', { ascending: false });

// 경기 상세 (쿼터 + 기록 포함)
const { data: match } = await supabase
  .from('matches')
  .select(`
    *,
    quarters (
      *,
      quarter_records (
        *,
        player:players (*)
      )
    )
  `)
  .eq('id', matchId)
  .single();
```

#### MVP 계산 (클라이언트 측)
```typescript
// 경기 내 MVP 계산
function calculateMVP(match: Match): Player | null {
  const playerRatings: Map<string, { total: number; count: number }> = new Map();

  match.quarters.forEach(quarter => {
    quarter.quarter_records.forEach(record => {
      if (record.rating !== null) {
        const current = playerRatings.get(record.player_id) || { total: 0, count: 0 };
        current.total += record.rating;
        current.count += 1;
        playerRatings.set(record.player_id, current);
      }
    });
  });

  let mvpPlayerId: string | null = null;
  let highestAvg = 0;

  playerRatings.forEach((value, playerId) => {
    const avg = value.total / value.count;
    if (avg > highestAvg) {
      highestAvg = avg;
      mvpPlayerId = playerId;
    }
  });

  return mvpPlayerId;
}
```

---

## 4. 인증 및 권한 정책

### 인증 플로우
```
1. 이메일/비밀번호로 회원가입
   ↓
2. Supabase Auth가 JWT 토큰 발급
   ↓
3. 토큰을 로컬 스토리지에 저장
   ↓
4. 모든 API 요청에 토큰 자동 포함
   ↓
5. RLS 정책이 auth.uid() 기반으로 권한 확인
   ↓
6. 본인 팀/경기/선수 데이터만 접근 가능
```

### RLS 정책 요약

| 테이블 | 정책 |
|--------|------|
| profiles | 본인 프로필만 CRUD |
| teams | 본인 팀만 CRUD |
| players | 본인 팀의 선수만 CRUD |
| matches | 본인 팀의 경기만 CRUD |
| quarters | 본인 경기의 쿼터만 CRUD |
| quarter_records | 본인 경기의 기록만 CRUD |

---

## 5. 마이그레이션 파일

### 초기 마이그레이션
```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM type
CREATE TYPE position_type AS ENUM ('GK', 'DF', 'MF', 'FW');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER,
  default_position position_type DEFAULT 'MF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  match_date DATE NOT NULL,
  location TEXT,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quarters table
CREATE TABLE quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  quarter_number INTEGER NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  duration_minutes INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, quarter_number)
);

-- Create quarter_records table
CREATE TABLE quarter_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position_type position_type NOT NULL,
  position_x DECIMAL(5,2) NOT NULL CHECK (position_x BETWEEN 0 AND 100),
  position_y DECIMAL(5,2) NOT NULL CHECK (position_y BETWEEN 0 AND 100),
  rating DECIMAL(3,1) CHECK (rating BETWEEN 0 AND 10),
  goals INTEGER DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER DEFAULT 0 CHECK (assists >= 0),
  clean_sheet BOOLEAN DEFAULT FALSE,
  contribution DECIMAL(3,1) DEFAULT 0 CHECK (contribution BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter_id, player_id)
);

-- Create indexes
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_match_date ON matches(match_date DESC);
CREATE INDEX idx_quarters_match_id ON quarters(match_id);
CREATE INDEX idx_quarter_records_quarter_id ON quarter_records(quarter_id);
CREATE INDEX idx_quarter_records_player_id ON quarter_records(player_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_records ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Users can CRUD own teams"
  ON teams FOR ALL USING (auth.uid() = user_id);

-- Players policies
CREATE POLICY "Users can CRUD players of own teams"
  ON players FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ));

-- Matches policies
CREATE POLICY "Users can CRUD matches of own teams"
  ON matches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ));

-- Quarters policies
CREATE POLICY "Users can CRUD quarters of own matches"
  ON quarters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM matches
    JOIN teams ON teams.id = matches.team_id
    WHERE matches.id = quarters.match_id AND teams.user_id = auth.uid()
  ));

-- Quarter records policies
CREATE POLICY "Users can CRUD quarter_records of own matches"
  ON quarter_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quarters
    JOIN matches ON matches.id = quarters.match_id
    JOIN teams ON teams.id = matches.team_id
    WHERE quarters.id = quarter_records.quarter_id AND teams.user_id = auth.uid()
  ));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quarters_updated_at BEFORE UPDATE ON quarters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quarter_records_updated_at BEFORE UPDATE ON quarter_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. 환경 변수

### 필수 환경 변수
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 7. 보안 체크리스트

- [x] 모든 테이블에 RLS 활성화
- [x] 사용자별 데이터 격리 (user_id 기반 정책)
- [ ] API 키를 환경 변수로 관리
- [ ] 입력값 검증 (프론트엔드 + DB 제약조건)
- [ ] HTTPS 적용 (Vercel/Supabase 자동)

---

## 8. 다음 단계

- [ ] 이 시스템 설계 검토 및 승인
- [ ] 디자인 스펙 작성 (DESIGN_SPEC.md)
- [ ] Supabase 프로젝트 생성
