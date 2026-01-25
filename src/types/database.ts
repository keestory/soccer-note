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
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  default_position: PositionType;
  created_at: string;
  updated_at: string;
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
}

export interface Quarter {
  id: string;
  match_id: string;
  quarter_number: number;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  quarter_records?: QuarterRecord[];
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
