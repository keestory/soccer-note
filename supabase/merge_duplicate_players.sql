-- Merge duplicate players (same team + same name) into one, combining all
-- records (appearances, attendance, goals, assists, clean sheets, contribution).
--
-- Run in the Supabase SQL Editor. Safe to run more than once.
-- TIP: run the PREVIEW query first to see what will be merged.

-- ── PREVIEW (read-only) ──────────────────────────────────────────────
-- SELECT team_id, trim(name) AS name, count(*) AS copies,
--        array_agg(id ORDER BY created_at) AS player_ids
-- FROM players
-- GROUP BY team_id, trim(name)
-- HAVING count(*) > 1;

-- ── MERGE ────────────────────────────────────────────────────────────
DO $$
DECLARE
  grp   RECORD;
  keep  UUID;
  dup   UUID;
  dups  UUID[];
BEGIN
  FOR grp IN
    SELECT team_id, trim(name) AS nm,
           array_agg(id ORDER BY (photo_url IS NOT NULL) DESC, created_at ASC) AS ids
    FROM players
    GROUP BY team_id, trim(name)
    HAVING count(*) > 1
  LOOP
    keep := grp.ids[1];                         -- canonical: has photo, else oldest
    dups := grp.ids[2:array_length(grp.ids,1)]; -- the rest

    FOREACH dup IN ARRAY dups LOOP
      -- quarter_records: sum stats when both have a row in the same quarter,
      -- then drop the duplicate quarter row and repoint the rest.
      UPDATE quarter_records k SET
        goals        = k.goals + d.goals,
        assists      = k.assists + d.assists,
        clean_sheet  = k.clean_sheet OR d.clean_sheet,
        contribution = LEAST(10, k.contribution + d.contribution),
        rating       = GREATEST(k.rating, d.rating)   -- Postgres GREATEST ignores NULLs
      FROM quarter_records d
      WHERE d.player_id = dup AND k.player_id = keep AND d.quarter_id = k.quarter_id;

      DELETE FROM quarter_records d
      WHERE d.player_id = dup
        AND EXISTS (SELECT 1 FROM quarter_records k
                    WHERE k.quarter_id = d.quarter_id AND k.player_id = keep);

      UPDATE quarter_records SET player_id = keep WHERE player_id = dup;

      -- match_attendees: UNIQUE(match_id, player_id) — drop conflicts, repoint
      DELETE FROM match_attendees a
      WHERE a.player_id = dup
        AND EXISTS (SELECT 1 FROM match_attendees b
                    WHERE b.match_id = a.match_id AND b.player_id = keep);
      UPDATE match_attendees SET player_id = keep WHERE player_id = dup;

      -- training_attendees: UNIQUE(training_id, player_id) — drop conflicts, repoint
      DELETE FROM training_attendees a
      WHERE a.player_id = dup
        AND EXISTS (SELECT 1 FROM training_attendees b
                    WHERE b.training_id = a.training_id AND b.player_id = keep);
      UPDATE training_attendees SET player_id = keep WHERE player_id = dup;

      -- Optional tables (skip if the feature/table isn't in this project)
      IF to_regclass('public.fitness_sessions') IS NOT NULL THEN
        UPDATE fitness_sessions SET player_id = keep WHERE player_id = dup;
      END IF;

      IF to_regclass('public.quarter_substitutions') IS NOT NULL THEN
        UPDATE quarter_substitutions SET player_out_id = keep WHERE player_out_id = dup;
        UPDATE quarter_substitutions SET player_in_id  = keep WHERE player_in_id  = dup;
      END IF;

      IF to_regclass('public.match_mom_votes') IS NOT NULL THEN
        UPDATE match_mom_votes SET voted_player_id = keep WHERE voted_player_id = dup;
      END IF;

      -- team member link
      UPDATE team_members SET linked_player_id = keep WHERE linked_player_id = dup;

      -- Backfill jersey number onto the canonical row if it was empty
      UPDATE players k SET number = COALESCE(k.number, d.number)
      FROM players d WHERE k.id = keep AND d.id = dup;

      -- Remove the now-empty duplicate
      DELETE FROM players WHERE id = dup;
    END LOOP;
  END LOOP;
END $$;
