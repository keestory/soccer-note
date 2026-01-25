-- SoccerNote Initial Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM type for positions
CREATE TYPE position_type AS ENUM ('GK', 'DF', 'MF', 'FW');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_user_id ON teams(user_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own teams"
  ON teams FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PLAYERS TABLE
-- ============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER,
  default_position position_type DEFAULT 'MF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_team_id ON players(team_id);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD players of own teams"
  ON players FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ));

-- ============================================
-- MATCHES TABLE
-- ============================================
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

CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_match_date ON matches(match_date DESC);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD matches of own teams"
  ON matches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ));

-- ============================================
-- QUARTERS TABLE
-- ============================================
CREATE TABLE quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  quarter_number INTEGER NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  duration_minutes INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, quarter_number)
);

CREATE INDEX idx_quarters_match_id ON quarters(match_id);

ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD quarters of own matches"
  ON quarters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM matches
    JOIN teams ON teams.id = matches.team_id
    WHERE matches.id = quarters.match_id AND teams.user_id = auth.uid()
  ));

-- ============================================
-- QUARTER_RECORDS TABLE
-- ============================================
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

CREATE INDEX idx_quarter_records_quarter_id ON quarter_records(quarter_id);
CREATE INDEX idx_quarter_records_player_id ON quarter_records(player_id);

ALTER TABLE quarter_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD quarter_records of own matches"
  ON quarter_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quarters
    JOIN matches ON matches.id = quarters.match_id
    JOIN teams ON teams.id = matches.team_id
    WHERE quarters.id = quarter_records.quarter_id AND teams.user_id = auth.uid()
  ));

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarters_updated_at
  BEFORE UPDATE ON quarters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarter_records_updated_at
  BEFORE UPDATE ON quarter_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HELPER FUNCTION: AUTO-CREATE 4 QUARTERS
-- ============================================
CREATE OR REPLACE FUNCTION public.create_quarters_for_match()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quarters (match_id, quarter_number)
  VALUES
    (NEW.id, 1),
    (NEW.id, 2),
    (NEW.id, 3),
    (NEW.id, 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_match_created
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION public.create_quarters_for_match();
