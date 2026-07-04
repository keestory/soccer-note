-- Community matching system
-- Teams can post match requests and apply to others

CREATE TABLE IF NOT EXISTS team_public_profiles (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '⚽',
  bio TEXT,
  region TEXT,
  preferred_format TEXT,  -- '5vs5', '6vs6', '7vs7', '8vs8', '11vs11'
  level TEXT,             -- '입문', '초급', '중급', '고급'
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  match_date DATE NOT NULL,
  match_time TEXT,         -- '09:00', '14:00' etc
  location TEXT NOT NULL,
  region TEXT NOT NULL,
  format TEXT NOT NULL,   -- '5vs5' etc
  level TEXT NOT NULL,    -- '초급' etc
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES match_posts(id) ON DELETE CASCADE,
  applying_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  match_id UUID REFERENCES matches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, applying_team_id)
);

-- RLS
ALTER TABLE team_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_applications ENABLE ROW LEVEL SECURITY;

-- team_public_profiles: anyone can read public profiles, only team owners/coaches can write
CREATE POLICY "public profiles are readable" ON team_public_profiles
  FOR SELECT USING (is_public = true OR auth.uid() IN (
    SELECT user_id FROM teams WHERE id = team_id
    UNION
    SELECT user_id FROM team_members WHERE team_id = team_public_profiles.team_id AND role = 'coach' AND status = 'approved'
  ));

CREATE POLICY "team owners can manage profile" ON team_public_profiles
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM teams WHERE id = team_id
    UNION
    SELECT user_id FROM team_members WHERE team_id = team_public_profiles.team_id AND role = 'coach' AND status = 'approved'
  ));

-- match_posts: anyone can read open posts, only team managers can create/update
CREATE POLICY "open posts are readable" ON match_posts
  FOR SELECT USING (
    status = 'open'
    OR auth.uid() IN (
      SELECT user_id FROM teams WHERE id = team_id
      UNION
      SELECT user_id FROM team_members WHERE team_id = match_posts.team_id AND role = 'coach' AND status = 'approved'
    )
  );

CREATE POLICY "team managers can create posts" ON match_posts
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM teams WHERE id = team_id
    UNION
    SELECT user_id FROM team_members WHERE team_id = match_posts.team_id AND role = 'coach' AND status = 'approved'
  ));

CREATE POLICY "team managers can update posts" ON match_posts
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM teams WHERE id = team_id
    UNION
    SELECT user_id FROM team_members WHERE team_id = match_posts.team_id AND role = 'coach' AND status = 'approved'
  ));

-- match_applications: applying team sees own, post owner sees all for their post
CREATE POLICY "see own applications" ON match_applications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM teams WHERE id = applying_team_id
      UNION
      SELECT user_id FROM team_members WHERE team_id = applying_team_id AND role = 'coach' AND status = 'approved'
    )
    OR auth.uid() IN (
      SELECT t.user_id FROM teams t
      JOIN match_posts mp ON mp.team_id = t.id
      WHERE mp.id = post_id
      UNION
      SELECT tm.user_id FROM team_members tm
      JOIN match_posts mp ON mp.team_id = tm.team_id
      WHERE mp.id = post_id AND tm.role = 'coach' AND tm.status = 'approved'
    )
  );

CREATE POLICY "team members can apply" ON match_applications
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM teams WHERE id = applying_team_id
    UNION
    SELECT user_id FROM team_members WHERE team_id = applying_team_id AND role = 'coach' AND status = 'approved'
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS match_posts_status_idx ON match_posts(status);
CREATE INDEX IF NOT EXISTS match_posts_region_idx ON match_posts(region);
CREATE INDEX IF NOT EXISTS match_posts_match_date_idx ON match_posts(match_date);
CREATE INDEX IF NOT EXISTS match_applications_post_id_idx ON match_applications(post_id);
CREATE INDEX IF NOT EXISTS match_applications_team_id_idx ON match_applications(applying_team_id);
