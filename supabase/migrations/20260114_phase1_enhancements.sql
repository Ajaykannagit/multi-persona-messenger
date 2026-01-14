/*
  # Phase 1 Core Feature Enhancements Migration
  
  This migration adds support for:
  1. User presence tracking (online/offline/away status)
  2. Typing indicators
  3. Unread message counts per channel
  4. Message status (sent/delivered/read)
  5. File attachments support
  
  ## New Tables
  - user_presence: Track user online status and last seen
  - typing_indicators: Track who is typing in which channel
  
  ## Modified Tables
  - persona_channels: Add unread_count column
  - messages: Add status, delivered_at, read_at, file_url, file_type, file_name columns
  
  ## Storage
  - Create message-attachments bucket for file uploads
*/

-- ============================================================================
-- 1. USER PRESENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'away')),
  last_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Anyone can read presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for fast presence lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);

-- ============================================================================
-- 2. TYPING INDICATORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES persona_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 seconds'),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for typing_indicators
CREATE POLICY "Users can read typing in their channels"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = typing_indicators.channel_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert typing in their channels"
  ON typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = channel_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own typing indicators"
  ON typing_indicators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing indicators"
  ON typing_indicators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast typing indicator lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_channel_id ON typing_indicators(channel_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires_at ON typing_indicators(expires_at);

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. MODIFY PERSONA_CHANNELS TABLE - Add unread_count
-- ============================================================================

ALTER TABLE persona_channels 
ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_persona_channels_unread_count ON persona_channels(unread_count) WHERE unread_count > 0;

-- ============================================================================
-- 4. MODIFY MESSAGES TABLE - Add status and file attachment fields
-- ============================================================================

-- Add message status tracking
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Add file attachment support
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_url text;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_type text;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_name text;

-- Index for message status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- ============================================================================
-- 5. DATABASE FUNCTIONS FOR UNREAD COUNT MANAGEMENT
-- ============================================================================

-- Function to increment unread count when a new message arrives
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS trigger AS $$
DECLARE
  channel_owner_id uuid;
BEGIN
  -- Get the owner of the channel (the user who is receiving the message)
  SELECT c.user_id INTO channel_owner_id
  FROM persona_channels pc
  JOIN contacts c ON c.id = pc.contact_id
  WHERE pc.id = NEW.channel_id;
  
  -- Only increment if the sender is NOT the channel owner
  IF NEW.sender_id != channel_owner_id THEN
    UPDATE persona_channels
    SET unread_count = unread_count + 1
    WHERE id = NEW.channel_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment unread count on new message
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON messages;
CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Function to reset unread count for a channel
CREATE OR REPLACE FUNCTION reset_unread_count(p_channel_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE persona_channels
  SET unread_count = 0
  WHERE id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_channel_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET 
    status = 'read',
    read_at = now()
  WHERE 
    channel_id = p_channel_id 
    AND sender_id != p_user_id
    AND status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. STORAGE BUCKET FOR FILE ATTACHMENTS
-- ============================================================================

-- Note: Storage buckets are created via Supabase dashboard or CLI
-- This is a reference for the bucket configuration needed:
-- 
-- Bucket name: message-attachments
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: image/*, application/pdf, application/msword, 
--                     application/vnd.openxmlformats-officedocument.*,
--                     text/plain, video/*, audio/*
--
-- RLS Policies for storage:
-- 1. Users can upload files to their own folders
-- 2. Users can read files from channels they have access to
-- 3. Users can delete their own uploaded files

-- ============================================================================
-- 7. HELPER VIEWS FOR ANALYTICS
-- ============================================================================

-- View to get total unread count per contact
CREATE OR REPLACE VIEW contact_unread_counts AS
SELECT 
  c.id as contact_id,
  c.user_id,
  SUM(pc.unread_count) as total_unread
FROM contacts c
LEFT JOIN persona_channels pc ON pc.contact_id = c.id
GROUP BY c.id, c.user_id;

-- ============================================================================
-- 8. REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Note: Messages and persona_channels should already be in realtime from previous migration
