export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      default_personas: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          color_primary: string
          color_secondary: string
          color_accent: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          color_primary: string
          color_secondary: string
          color_accent: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          color_primary?: string
          color_secondary?: string
          color_accent?: string
          sort_order?: number
        }
      }
      user_personas: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          icon: string
          color_primary: string
          color_secondary: string
          color_accent: string
          is_custom: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          icon: string
          color_primary: string
          color_secondary: string
          color_accent: string
          is_custom?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          icon?: string
          color_primary?: string
          color_secondary?: string
          color_accent?: string
          is_custom?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          contact_user_id: string
          nickname: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_user_id: string
          nickname?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_user_id?: string
          nickname?: string | null
          created_at?: string
        }
      }
      persona_channels: {
        Row: {
          id: string
          contact_id: string
          persona_id: string
          last_message_at: string | null
          is_locked: boolean
          notification_enabled: boolean
          unread_count: number
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          persona_id: string
          last_message_at?: string | null
          is_locked?: boolean
          notification_enabled?: boolean
          unread_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          persona_id?: string
          last_message_at?: string | null
          is_locked?: boolean
          notification_enabled?: boolean
          unread_count?: number
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string
          content: string
          detected_tone: string | null
          is_read: boolean
          status: 'sent' | 'delivered' | 'read'
          delivered_at: string | null
          read_at: string | null
          file_url: string | null
          file_type: string | null
          file_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id: string
          content: string
          detected_tone?: string | null
          is_read?: boolean
          status?: 'sent' | 'delivered' | 'read'
          delivered_at?: string | null
          read_at?: string | null
          file_url?: string | null
          file_type?: string | null
          file_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          sender_id?: string
          content?: string
          detected_tone?: string | null
          is_read?: boolean
          status?: 'sent' | 'delivered' | 'read'
          delivered_at?: string | null
          read_at?: string | null
          file_url?: string | null
          file_type?: string | null
          file_name?: string | null
          created_at?: string
        }
      }
      user_presence: {
        Row: {
          id: string
          user_id: string
          status: 'online' | 'offline' | 'away'
          last_seen: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status: 'online' | 'offline' | 'away'
          last_seen?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'online' | 'offline' | 'away'
          last_seen?: string
          updated_at?: string
        }
      }
      typing_indicators: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          created_at?: string
          expires_at?: string
        }
      }
      persona_analytics: {
        Row: {
          id: string
          channel_id: string
          message_count: number
          last_active_date: string | null
          avg_response_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          message_count?: number
          last_active_date?: string | null
          avg_response_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          message_count?: number
          last_active_date?: string | null
          avg_response_time_minutes?: number | null
          updated_at?: string
        }
      }
    }
  }
}
