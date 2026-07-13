export type PositionType = 'GK' | 'DF' | 'MF' | 'FW';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  is_removed?: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamRole = 'coach' | 'member' | 'parent';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: MemberStatus;
  can_edit_players: boolean;
  can_edit_matches: boolean;
  can_edit_quarters: boolean;
  is_removed?: boolean;
  child_name?: string | null;
  linked_player_id?: string | null;
  joined_at: string;
  updated_at: string;
  team?: Team;
  profile?: Profile;
}

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export const ATTRIBUTE_KEYS: (keyof PlayerAttributes)[] = [
  'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical',
];

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  default_position: PositionType;
  bio?: string | null;
  preferred_positions?: string[] | null;
  preferred_numbers?: string | null;
  photo_url?: string | null;
  attributes?: PlayerAttributes | null;
  strength_tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface MatchAttendee {
  id: string;
  match_id: string;
  player_id: string;
  created_at: string;
  player?: Player;
}

export interface Match {
  id: string;
  team_id: string;
  opponent: string;
  match_date: string;
  location: string | null;
  home_score: number;
  away_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  quarters?: Quarter[];
  match_attendees?: MatchAttendee[];
}

export interface QuarterSubstitution {
  id: string;
  quarter_id: string;
  player_out_id: string;
  player_in_id: string;
  minute: number;
  created_at: string;
  player_out?: Player;
  player_in?: Player;
}

export interface Quarter {
  id: string;
  match_id: string;
  quarter_number: number;
  duration_minutes: number;
  home_score: number;
  away_score: number;
  created_at: string;
  updated_at: string;
  quarter_records?: QuarterRecord[];
  quarter_substitutions?: QuarterSubstitution[];
}

export interface QuarterRecord {
  id: string;
  quarter_id: string;
  player_id: string;
  position_type: PositionType;
  position_x: number;
  position_y: number;
  rating: number | null;
  goals: number;
  assists: number;
  clean_sheet: boolean;
  contribution: number;
  praise_text: string | null;
  improvement_text: string | null;
  highlight_text: string | null;
  media_urls: string[] | null;
  created_at: string;
  updated_at: string;
  player?: Player;
}

// For calculating MVP
export interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  totalRating: number;
  ratingCount: number;
  averageRating: number;
  totalGoals: number;
  totalAssists: number;
  cleanSheets: number;
  avgContribution: number;
}

// Position colors for UI
export const POSITION_COLORS: Record<PositionType, string> = {
  GK: '#F59E0B', // amber-500
  DF: '#3B82F6', // blue-500
  MF: '#10B981', // emerald-500
  FW: '#EF4444', // red-500
};

export const POSITION_LABELS: Record<PositionType, string> = {
  GK: '골키퍼',
  DF: '수비수',
  MF: '미드필더',
  FW: '공격수',
};

// Training types
export type TrainingType = 'mini-game' | 'passing' | 'shooting' | 'fitness' | 'tactics' | 'mixed' | 'other';

export interface TrainingSession {
  id: string;
  team_id: string;
  training_date: string;
  training_type: TrainingType;
  location: string | null;
  duration_minutes: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingAttendee {
  id: string;
  training_id: string;
  player_id: string;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  player?: Player;
}

export interface TeamVisibilitySettings {
  id: string;
  team_id: string;
  show_match_records: boolean;
  show_player_stats: boolean;
  show_player_ratings: boolean;
  show_quarter_details: boolean;
  show_formation: boolean;
  show_attendance: boolean;
  show_goals_assists: boolean;
  show_training_records: boolean;
  show_training_feedback: boolean;
  created_at: string;
  updated_at: string;
}

// Community matching types
export type PostStatus = 'open' | 'matched' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type MatchFormat = '5vs5' | '6vs6' | '7vs7' | '8vs8' | '11vs11';
export type TeamLevel = '입문' | '초급' | '중급' | '고급';

export interface TeamPublicProfile {
  team_id: string;
  emoji: string;
  bio: string | null;
  region: string | null;
  preferred_format: string | null;
  level: string | null;
  is_public: boolean;
  updated_at: string;
  team?: Team;
}

export interface MatchPost {
  id: string;
  team_id: string;
  title: string;
  match_date: string;
  match_time: string | null;
  location: string;
  region: string;
  format: string;
  level: string;
  description: string | null;
  status: PostStatus;
  expires_at: string;
  created_at: string;
  team?: Team;
  team_profile?: TeamPublicProfile;
  applications_count?: number;
}

export interface MatchApplication {
  id: string;
  post_id: string;
  applying_team_id: string;
  message: string | null;
  status: ApplicationStatus;
  match_id: string | null;
  created_at: string;
  applying_team?: Team;
  applying_team_profile?: TeamPublicProfile;
  post?: MatchPost;
}
