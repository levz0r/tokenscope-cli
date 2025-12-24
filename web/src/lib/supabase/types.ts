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
          name: string | null
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          api_key?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          api_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          local_session_id: string
          start_time: string
          end_time: string | null
          project_name: string | null
          source: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          local_session_id: string
          start_time: string
          end_time?: string | null
          project_name?: string | null
          source?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          local_session_id?: string
          start_time?: string
          end_time?: string | null
          project_name?: string | null
          source?: string | null
          reason?: string | null
          created_at?: string
        }
      }
      tool_uses: {
        Row: {
          id: string
          session_id: string
          tool_name: string
          tool_use_id: string | null
          timestamp: string
          success: boolean
        }
        Insert: {
          id?: string
          session_id: string
          tool_name: string
          tool_use_id?: string | null
          timestamp: string
          success?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          tool_name?: string
          tool_use_id?: string | null
          timestamp?: string
          success?: boolean
        }
      }
      file_changes: {
        Row: {
          id: string
          session_id: string
          file_path: string
          operation: 'write' | 'edit' | 'read'
          lines_added: number
          lines_removed: number
          timestamp: string
        }
        Insert: {
          id?: string
          session_id: string
          file_path: string
          operation: 'write' | 'edit' | 'read'
          lines_added?: number
          lines_removed?: number
          timestamp: string
        }
        Update: {
          id?: string
          session_id?: string
          file_path?: string
          operation?: 'write' | 'edit' | 'read'
          lines_added?: number
          lines_removed?: number
          timestamp?: string
        }
      }
      git_operations: {
        Row: {
          id: string
          session_id: string
          command: string | null
          operation_type: string
          exit_code: number
          timestamp: string
        }
        Insert: {
          id?: string
          session_id: string
          command?: string | null
          operation_type: string
          exit_code?: number
          timestamp: string
        }
        Update: {
          id?: string
          session_id?: string
          command?: string | null
          operation_type?: string
          exit_code?: number
          timestamp?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          team_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: 'active' | 'inactive' | 'canceled' | 'past_due'
          seats: number
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: 'active' | 'inactive' | 'canceled' | 'past_due'
          seats?: number
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: 'active' | 'inactive' | 'canceled' | 'past_due'
          seats?: number
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_user_by_api_key: {
        Args: { key: string }
        Returns: { user_id: string; email: string; team_id: string | null }[]
      }
      regenerate_api_key: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_user_analytics_summary: {
        Args: { target_user_id: string; days_back?: number }
        Returns: Json
      }
    }
  }
}
