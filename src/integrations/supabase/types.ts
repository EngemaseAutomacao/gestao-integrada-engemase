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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      maintenance_records: {
        Row: {
          condition_after: string | null
          condition_before: string | null
          cost: number | null
          created_at: string
          description: string
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          parts_replaced: string | null
          performed_by: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          condition_after?: string | null
          condition_before?: string | null
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          parts_replaced?: string | null
          performed_by: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          condition_after?: string | null
          condition_before?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          parts_replaced?: string | null
          performed_by?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          checkout_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          tool_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          checkout_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          tool_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          checkout_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          tool_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "tool_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          category: Database["public"]["Enums"]["user_category"]
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["user_category"]
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["user_category"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      tool_checkouts: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkout_date: string
          construction_site: string | null
          created_at: string
          estimated_return_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["checkout_status"]
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkout_date?: string
          construction_site?: string | null
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checkout_status"]
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkout_date?: string
          construction_site?: string | null
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checkout_status"]
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_checkouts_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          brand: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_only: boolean
          id: string
          name: string
          qr_code: string | null
          quantity_available: number
          quantity_total: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_only?: boolean
          id?: string
          name: string
          qr_code?: string | null
          quantity_available?: number
          quantity_total?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_only?: boolean
          id?: string
          name?: string
          qr_code?: string | null
          quantity_available?: number
          quantity_total?: number
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_low_stock: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_overdue_tools: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_return_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_email_from_username: {
        Args: { _username: string }
        Returns: string
      }
      get_tool_usage_history: {
        Args: { tool_uuid: string }
        Returns: {
          checkin_date: string
          checkout_date: string
          checkout_id: string
          construction_site: string
          days_used: number
          status: string
          user_category: string
          user_email: string
          user_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      checkout_status: "checked_out" | "checked_in"
      user_category: "engemase_employee" | "third_party"
      user_role: "admin" | "employee" | "third_party"
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
  public: {
    Enums: {
      checkout_status: ["checked_out", "checked_in"],
      user_category: ["engemase_employee", "third_party"],
      user_role: ["admin", "employee", "third_party"],
    },
  },
} as const
