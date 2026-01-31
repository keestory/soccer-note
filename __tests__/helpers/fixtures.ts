import type { Match, Quarter, QuarterRecord, Player, Team } from '@/types/database'

export const testPlayer: Player = {
  id: 'player-1',
  team_id: 'team-1',
  name: '김민수',
  number: 10,
  default_position: 'MF',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const testPlayer2: Player = {
  id: 'player-2',
  team_id: 'team-1',
  name: '박지성',
  number: 7,
  default_position: 'FW',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const testQuarterRecord: QuarterRecord = {
  id: 'record-1',
  quarter_id: 'quarter-1',
  player_id: 'player-1',
  position_type: 'MF',
  position_x: 50,
  position_y: 50,
  rating: 8.5,
  goals: 1,
  assists: 2,
  clean_sheet: false,
  contribution: 7,
  praise_text: null,
  improvement_text: null,
  highlight_text: null,
  media_urls: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  player: testPlayer,
}

export const testQuarterRecord2: QuarterRecord = {
  id: 'record-2',
  quarter_id: 'quarter-1',
  player_id: 'player-2',
  position_type: 'FW',
  position_x: 50,
  position_y: 30,
  rating: 7.0,
  goals: 2,
  assists: 0,
  clean_sheet: false,
  contribution: 6,
  praise_text: null,
  improvement_text: null,
  highlight_text: null,
  media_urls: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  player: testPlayer2,
}

export const testQuarter: Quarter = {
  id: 'quarter-1',
  match_id: 'match-1',
  quarter_number: 1,
  duration_minutes: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  quarter_records: [testQuarterRecord],
}

export const testQuarterMultiPlayer: Quarter = {
  id: 'quarter-1',
  match_id: 'match-1',
  quarter_number: 1,
  duration_minutes: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  quarter_records: [testQuarterRecord, testQuarterRecord2],
}

export const testQuarter2: Quarter = {
  id: 'quarter-2',
  match_id: 'match-1',
  quarter_number: 2,
  duration_minutes: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  quarter_records: [{
    ...testQuarterRecord,
    id: 'record-3',
    quarter_id: 'quarter-2',
    rating: 9.0,
    goals: 0,
    assists: 1,
    contribution: 8,
  }],
}

export const testMatch: Match = {
  id: 'match-1',
  team_id: 'team-1',
  opponent: 'FC Seoul',
  match_date: '2024-06-15',
  location: '잠실 운동장',
  home_score: 3,
  away_score: 1,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  quarters: [testQuarter],
}

export const testMatchMultiQuarter: Match = {
  ...testMatch,
  quarters: [testQuarter, testQuarter2],
}

export const testMatchMultiPlayer: Match = {
  ...testMatch,
  quarters: [testQuarterMultiPlayer],
}

export const testMatchNoQuarters: Match = {
  ...testMatch,
  id: 'match-2',
  quarters: undefined,
}

export const testMatchNullRating: Match = {
  ...testMatch,
  quarters: [{
    ...testQuarter,
    quarter_records: [{
      ...testQuarterRecord,
      rating: null,
    }],
  }],
}

export const testTeam: Team = {
  id: 'team-1',
  user_id: 'user-1',
  name: 'Test FC',
  description: 'A test team',
  invite_code: 'ABC123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
