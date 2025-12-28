export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_spawns: {
        Row: {
          agent_type: string
          background: boolean | null
          description: string | null
          id: string
          model: string | null
          session_id: string
          timestamp: string
        }
        Insert: {
          agent_type: string
          background?: boolean | null
          description?: string | null
          id?: string
          model?: string | null
          session_id: string
          timestamp?: string
        }
        Update: {
          agent_type?: string
          background?: boolean | null
          description?: string | null
          id?: string
          model?: string | null
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_spawns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      file_changes: {
        Row: {
          file_path: string
          id: string
          lines_added: number | null
          lines_removed: number | null
          operation: string
          session_id: string | null
          timestamp: string
        }
        Insert: {
          file_path: string
          id?: string
          lines_added?: number | null
          lines_removed?: number | null
          operation: string
          session_id?: string | null
          timestamp: string
        }
        Update: {
          file_path?: string
          id?: string
          lines_added?: number | null
          lines_removed?: number | null
          operation?: string
          session_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      git_operations: {
        Row: {
          command: string | null
          exit_code: number | null
          id: string
          operation_type: string
          session_id: string | null
          timestamp: string
        }
        Insert: {
          command?: string | null
          exit_code?: number | null
          id?: string
          operation_type: string
          session_id?: string | null
          timestamp: string
        }
        Update: {
          command?: string | null
          exit_code?: number | null
          id?: string
          operation_type?: string
          session_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "git_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      github_installations: {
        Row: {
          access_token: string | null
          created_at: string | null
          github_user_id: number
          github_username: string
          id: string
          installation_id: number
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          github_user_id: number
          github_username: string
          id?: string
          installation_id: number
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          github_user_id?: number
          github_username?: string
          id?: string
          installation_id?: number
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      installed_plugins: {
        Row: {
          first_seen: string
          has_agents: boolean | null
          has_hooks: boolean | null
          has_mcp: boolean | null
          has_skills: boolean | null
          id: string
          last_seen: string
          plugin_name: string
          plugin_source: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          first_seen?: string
          has_agents?: boolean | null
          has_hooks?: boolean | null
          has_mcp?: boolean | null
          has_skills?: boolean | null
          id?: string
          last_seen?: string
          plugin_name: string
          plugin_source?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          first_seen?: string
          has_agents?: boolean | null
          has_hooks?: boolean | null
          has_mcp?: boolean | null
          has_skills?: boolean | null
          id?: string
          last_seen?: string
          plugin_name?: string
          plugin_source?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installed_plugins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          api_key_last_used_at: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_key_last_used_at?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_key_last_used_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repo_analysis: {
        Row: {
          ai_commits: number | null
          ai_lines_added: number | null
          ai_lines_removed: number | null
          analyzed_at: string | null
          id: string
          repo_id: string
          total_commits: number | null
          total_lines: number | null
        }
        Insert: {
          ai_commits?: number | null
          ai_lines_added?: number | null
          ai_lines_removed?: number | null
          analyzed_at?: string | null
          id?: string
          repo_id: string
          total_commits?: number | null
          total_lines?: number | null
        }
        Update: {
          ai_commits?: number | null
          ai_lines_added?: number | null
          ai_lines_removed?: number | null
          analyzed_at?: string | null
          id?: string
          repo_id?: string
          total_commits?: number | null
          total_lines?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repo_analysis_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: true
            referencedRelation: "tracked_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      repo_analysis_history: {
        Row: {
          ai_commits: number | null
          ai_percentage: number | null
          created_at: string | null
          id: string
          repo_id: string
          snapshot_date: string
          total_commits: number | null
        }
        Insert: {
          ai_commits?: number | null
          ai_percentage?: number | null
          created_at?: string | null
          id?: string
          repo_id: string
          snapshot_date: string
          total_commits?: number | null
        }
        Update: {
          ai_commits?: number | null
          ai_percentage?: number | null
          created_at?: string | null
          id?: string
          repo_id?: string
          snapshot_date?: string
          total_commits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repo_analysis_history_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "tracked_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      repo_commits: {
        Row: {
          author_email: string | null
          author_name: string | null
          commit_message: string | null
          commit_sha: string
          committed_at: string | null
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          lines_added: number | null
          lines_removed: number | null
          repo_id: string
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          commit_message?: string | null
          commit_sha: string
          committed_at?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          lines_added?: number | null
          lines_removed?: number | null
          repo_id: string
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          commit_message?: string | null
          commit_sha?: string
          committed_at?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          lines_added?: number | null
          lines_removed?: number | null
          repo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repo_commits_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "tracked_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          local_session_id: string
          project_name: string | null
          reason: string | null
          source: string | null
          start_time: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          local_session_id: string
          project_name?: string | null
          reason?: string | null
          source?: string | null
          start_time: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          local_session_id?: string
          project_name?: string | null
          reason?: string | null
          source?: string | null
          start_time?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_uses: {
        Row: {
          args: string | null
          id: string
          plugin_name: string | null
          session_id: string
          skill_name: string
          timestamp: string
        }
        Insert: {
          args?: string | null
          id?: string
          plugin_name?: string | null
          session_id: string
          skill_name: string
          timestamp?: string
        }
        Update: {
          args?: string | null
          id?: string
          plugin_name?: string | null
          session_id?: string
          skill_name?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_uses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          seats: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          seats?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          seats?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_uses: {
        Row: {
          id: string
          session_id: string | null
          success: boolean | null
          timestamp: string
          tool_name: string
          tool_use_id: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          success?: boolean | null
          timestamp: string
          tool_name: string
          tool_use_id?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          success?: boolean | null
          timestamp?: string
          tool_name?: string
          tool_use_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_uses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_repos: {
        Row: {
          created_at: string | null
          default_branch: string | null
          id: string
          installation_id: string
          is_active: boolean | null
          last_analyzed_at: string | null
          last_push_at: string | null
          repo_full_name: string
          repo_id: number
          repo_name: string
        }
        Insert: {
          created_at?: string | null
          default_branch?: string | null
          id?: string
          installation_id: string
          is_active?: boolean | null
          last_analyzed_at?: string | null
          last_push_at?: string | null
          repo_full_name: string
          repo_id: number
          repo_name: string
        }
        Update: {
          created_at?: string | null
          default_branch?: string | null
          id?: string
          installation_id?: string
          is_active?: boolean | null
          last_analyzed_at?: string | null
          last_push_at?: string | null
          repo_full_name?: string
          repo_id?: number
          repo_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_repos_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "github_installations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_analytics_summary: {
        Args: { days_back?: number; target_user_id: string }
        Returns: Json
      }
      get_user_by_api_key: {
        Args: { key: string }
        Returns: {
          email: string
          team_id: string
          user_id: string
        }[]
      }
      get_user_team_ids: { Args: { check_user_id: string }; Returns: string[] }
      regenerate_api_key: { Args: { target_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
