-- Mova Campus Migration: Unique Usernames & Focus Mode Sessions
-- Timestamp: 20261123100000

-- 1. Unique index for case-insensitive student usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL;

-- 2. Focus Mode Sessions Table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  preset_name VARCHAR(50) DEFAULT 'pomodoro',
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user focus history
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed
ON public.focus_sessions (user_id, completed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can view own focus sessions"
ON public.focus_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can insert own focus sessions"
ON public.focus_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can delete own focus sessions"
ON public.focus_sessions FOR DELETE
USING (auth.uid() = user_id);
