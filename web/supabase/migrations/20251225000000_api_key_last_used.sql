-- Add api_key_last_used_at column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_key_last_used_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_api_key_last_used ON profiles(api_key_last_used_at);
