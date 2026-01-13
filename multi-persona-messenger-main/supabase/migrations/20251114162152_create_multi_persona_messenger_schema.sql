/*
  # Multi-Persona Messenger Database Schema

  ## Overview
  Complete database architecture for a messaging app where each contact has multiple persona-based chat channels.
  Each persona represents a different emotional/functional context (Fun, Serious, Professional, etc.).

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `display_name` (text)
  - `avatar_url` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `default_personas`
  Built-in persona templates available to all users
  - `id` (uuid, PK)
  - `name` (text) - e.g., "Fun", "Serious", "Professional"
  - `description` (text)
  - `icon` (text) - Lucide icon name
  - `color_primary` (text) - Hex color
  - `color_secondary` (text) - Hex color
  - `color_accent` (text) - Hex color
  - `sort_order` (integer)

  ### `user_personas`
  User's custom or enabled personas
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `name` (text)
  - `description` (text)
  - `icon` (text)
  - `color_primary` (text)
  - `color_secondary` (text)
  - `color_accent` (text)
  - `is_custom` (boolean) - true for user-created
  - `is_active` (boolean) - enabled/disabled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `contacts`
  User's contact list
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles) - owner
  - `contact_user_id` (uuid, FK to profiles) - the contact
  - `nickname` (text, optional)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, contact_user_id)

  ### `persona_channels`
  Individual chat channels per persona per contact
  - `id` (uuid, PK)
  - `contact_id` (uuid, FK to contacts)
  - `persona_id` (uuid, FK to user_personas)
  - `last_message_at` (timestamptz, optional)
  - `is_locked` (boolean) - privacy lock
  - `notification_enabled` (boolean)
  - `created_at` (timestamptz)
  - Unique constraint on (contact_id, persona_id)

  ### `messages`
  All messages across all persona channels
  - `id` (uuid, PK)
  - `channel_id` (uuid, FK to persona_channels)
  - `sender_id` (uuid, FK to profiles)
  - `content` (text)
  - `detected_tone` (text, optional) - AI-detected tone
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ### `persona_analytics`
  Aggregated analytics per persona per contact
  - `id` (uuid, PK)
  - `channel_id` (uuid, FK to persona_channels)
  - `message_count` (integer)
  - `last_active_date` (date)
  - `avg_response_time_minutes` (integer, optional)
  - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Contacts can see messages in shared channels
  - Analytics are private to channel owner

  ## 3. Indexes
  - Fast lookups for contacts, channels, and recent messages
  - Optimized queries for analytics and persona switching
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS default_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  is_custom boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_user_id),
  CHECK (user_id != contact_user_id)
);

CREATE TABLE IF NOT EXISTS persona_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES user_personas(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  is_locked boolean DEFAULT false,
  notification_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, persona_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES persona_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  detected_tone text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Trigger function to update persona_analytics when a new message is created
CREATE OR REPLACE FUNCTION update_persona_analytics_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO persona_analytics (
    channel_id,
    message_count,
    last_active_date,
    updated_at
  )
  VALUES (
    NEW.channel_id,
    1,
    CURRENT_DATE,
    now()
  )
  ON CONFLICT (channel_id)
  DO UPDATE SET
    message_count = persona_analytics.message_count + 1,
    last_active_date = CURRENT_DATE,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger function to keep persona_channels.last_message_at current
CREATE OR REPLACE FUNCTION update_channel_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE persona_channels
  SET last_message_at = GREATEST(COALESCE(last_message_at, TIMESTAMPTZ 'epoch'), NEW.created_at)
  WHERE id = NEW.channel_id;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS persona_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES persona_channels(id) ON DELETE CASCADE,
  message_count integer DEFAULT 0,
  last_active_date date,
  avg_response_time_minutes integer,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(channel_id)
);

-- Function: handle_new_user
-- Atomically creates a profile and default user personas for a new user
CREATE OR REPLACE FUNCTION handle_new_user(
  _user_id uuid,
  _email text,
  _display_name text,
  _avatar_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile if it doesn't already exist
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (_user_id, _email, _display_name, _avatar_url)
  ON CONFLICT (id) DO NOTHING;

  -- Seed user_personas from default_personas for this user
  INSERT INTO user_personas (
    user_id,
    name,
    description,
    icon,
    color_primary,
    color_secondary,
    color_accent,
    is_custom,
    is_active
  )
  SELECT
    _user_id,
    dp.name,
    dp.description,
    dp.icon,
    dp.color_primary,
    dp.color_secondary,
    dp.color_accent,
    false,
    true
  FROM default_personas dp
  WHERE NOT EXISTS (
    SELECT 1
    FROM user_personas up
    WHERE up.user_id = _user_id
      AND up.name = dp.name
  );
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can read default personas"
  ON default_personas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own personas"
  ON user_personas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas"
  ON user_personas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON user_personas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON user_personas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read contacts where they are involved"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = contact_user_id
  );

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read channels where they are involved"
  ON persona_channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = persona_channels.contact_id
      AND (
        contacts.user_id = auth.uid()
        OR contacts.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own channels"
  ON persona_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update channels where they are involved"
  ON persona_channels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = persona_channels.contact_id
      AND (
        contacts.user_id = auth.uid()
        OR contacts.contact_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = persona_channels.contact_id
      AND (
        contacts.user_id = auth.uid()
        OR contacts.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete channels they own"
  ON persona_channels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = persona_channels.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read messages in channels where they are involved"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = messages.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages in channels where they are involved"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Participants can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = messages.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = messages.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can read analytics for channels where they are involved"
  ON persona_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = persona_analytics.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage analytics for channels where user is involved"
  ON persona_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can update analytics for channels where user is involved"
  ON persona_analytics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = persona_analytics.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM persona_channels pc
      JOIN contacts c ON c.id = pc.contact_id
      WHERE pc.id = persona_analytics.channel_id
      AND (
        c.user_id = auth.uid()
        OR c.contact_user_id = auth.uid()
      )
    )
  );

-- Trigger to keep persona_analytics in sync with new messages
DROP TRIGGER IF EXISTS trg_update_persona_analytics_on_message ON messages;

CREATE TRIGGER trg_update_persona_analytics_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_persona_analytics_on_message();

-- Trigger to keep persona_channels.last_message_at updated on new messages
DROP TRIGGER IF EXISTS trg_update_channel_last_message_at ON messages;

CREATE TRIGGER trg_update_channel_last_message_at
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_channel_last_message_at();

CREATE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_persona_channels_contact_id ON persona_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_persona_channels_persona_id ON persona_channels(persona_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id_is_read ON messages(channel_id, is_read);
CREATE INDEX IF NOT EXISTS idx_persona_analytics_channel_id ON persona_analytics(channel_id);

INSERT INTO default_personas (name, description, icon, color_primary, color_secondary, color_accent, sort_order) VALUES
  ('Fun', 'Casual, playful conversations full of humor and spontaneity', 'Smile', '#FF6B6B', '#FFE66D', '#FF8E53', 1),
  ('Serious', 'Deep, meaningful discussions about important topics', 'Brain', '#4A5568', '#2D3748', '#718096', 2),
  ('Professional', 'Work-related, formal communication', 'Briefcase', '#3182CE', '#2C5282', '#63B3ED', 3),
  ('Personal', 'Intimate, private thoughts and feelings', 'Heart', '#9F7AEA', '#805AD5', '#B794F4', 4),
  ('Romantic', 'Expressions of love, affection, and connection', 'Sparkles', '#F687B3', '#D53F8C', '#FBB6CE', 5),
  ('Family', 'Warm, supportive family communications', 'Home', '#48BB78', '#38A169', '#68D391', 6),
  ('Study', 'Educational discussions and learning together', 'BookOpen', '#ED8936', '#DD6B20', '#F6AD55', 7),
  ('Gaming', 'Fun gaming sessions and competitive banter', 'Gamepad2', '#00B5D8', '#0987A0', '#76E4F7', 8);
