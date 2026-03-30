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
      construction_sites: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_sites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          cost_per_liter: number | null
          created_at: string
          fuel_type: string
          gas_station: string | null
          id: string
          km_at_refuel: number
          liters: number
          notes: string | null
          refuel_date: string
          total_cost: number | null
          user_id: string
          vehicle_checkout_id: string | null
          vehicle_id: string
        }
        Insert: {
          cost_per_liter?: number | null
          created_at?: string
          fuel_type?: string
          gas_station?: string | null
          id?: string
          km_at_refuel: number
          liters: number
          notes?: string | null
          refuel_date?: string
          total_cost?: number | null
          user_id: string
          vehicle_checkout_id?: string | null
          vehicle_id: string
        }
        Update: {
          cost_per_liter?: number | null
          created_at?: string
          fuel_type?: string
          gas_station?: string | null
          id?: string
          km_at_refuel?: number
          liters?: number
          notes?: string | null
          refuel_date?: string
          total_cost?: number | null
          user_id?: string
          vehicle_checkout_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_vehicle_checkout_id_fkey"
            columns: ["vehicle_checkout_id"]
            isOneToOne: false
            referencedRelation: "vehicle_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          approved: boolean
          category: Database["public"]["Enums"]["user_category"]
          company: string | null
          created_at: string
          email: string
          first_login: boolean
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          approved?: boolean
          category?: Database["public"]["Enums"]["user_category"]
          company?: string | null
          created_at?: string
          email: string
          first_login?: boolean
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          approved?: boolean
          category?: Database["public"]["Enums"]["user_category"]
          company?: string | null
          created_at?: string
          email?: string
          first_login?: boolean
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_in_address: string | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_out: string | null
          clock_out_address: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_in_address?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out?: string | null
          clock_out_address?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_in_address?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out?: string | null
          clock_out_address?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_checkouts: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkin_photo_url: string | null
          checkin_signature_url: string | null
          checkout_date: string
          checkout_photo_url: string | null
          checkout_signature_url: string | null
          construction_site: string | null
          created_at: string
          estimated_return_date: string | null
          id: string
          notes: string | null
          selected_tag: string | null
          status: Database["public"]["Enums"]["checkout_status"]
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkin_photo_url?: string | null
          checkin_signature_url?: string | null
          checkout_date?: string
          checkout_photo_url?: string | null
          checkout_signature_url?: string | null
          construction_site?: string | null
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          selected_tag?: string | null
          status?: Database["public"]["Enums"]["checkout_status"]
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkin_photo_url?: string | null
          checkin_signature_url?: string | null
          checkout_date?: string
          checkout_photo_url?: string | null
          checkout_signature_url?: string | null
          construction_site?: string | null
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          selected_tag?: string | null
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
      tool_issues: {
        Row: {
          checkout_id: string | null
          created_at: string
          description: string
          id: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          checkout_id?: string | null
          created_at?: string
          description: string
          id?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          checkout_id?: string | null
          created_at?: string
          description?: string
          id?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_issues_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "tool_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_issues_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      vehicle_checkouts: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkout_date: string
          created_at: string
          destination: string | null
          id: string
          km_checkin: number | null
          km_checkout: number
          notes: string | null
          photo_back_checkin: string | null
          photo_back_checkout: string | null
          photo_front_checkin: string | null
          photo_front_checkout: string | null
          photo_left_checkin: string | null
          photo_left_checkout: string | null
          photo_right_checkin: string | null
          photo_right_checkout: string | null
          purpose: string | null
          refueled: boolean | null
          status: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkout_date?: string
          created_at?: string
          destination?: string | null
          id?: string
          km_checkin?: number | null
          km_checkout: number
          notes?: string | null
          photo_back_checkin?: string | null
          photo_back_checkout?: string | null
          photo_front_checkin?: string | null
          photo_front_checkout?: string | null
          photo_left_checkin?: string | null
          photo_left_checkout?: string | null
          photo_right_checkin?: string | null
          photo_right_checkout?: string | null
          purpose?: string | null
          refueled?: boolean | null
          status?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkout_date?: string
          created_at?: string
          destination?: string | null
          id?: string
          km_checkin?: number | null
          km_checkout?: number
          notes?: string | null
          photo_back_checkin?: string | null
          photo_back_checkout?: string | null
          photo_front_checkin?: string | null
          photo_front_checkout?: string | null
          photo_left_checkin?: string | null
          photo_left_checkout?: string | null
          photo_right_checkin?: string | null
          photo_right_checkout?: string | null
          purpose?: string | null
          refueled?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checkouts_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          model: string | null
          name: string
          plate: string
          status: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          plate: string
          status?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          plate?: string
          status?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_low_stock: { Args: never; Returns: undefined }
      check_maintenance_reminders: { Args: never; Returns: undefined }
      check_overdue_tools: { Args: never; Returns: undefined }
      check_prolonged_vehicle_use: { Args: never; Returns: undefined }
      check_return_reminders: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      get_email_from_username: { Args: { _username: string }; Returns: string }
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
      issue_severity: "low" | "medium" | "high" | "critical"
      issue_status: "open" | "in_progress" | "resolved" | "closed"
      user_category: "engemase_employee" | "third_party" | "socios"
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
      issue_severity: ["low", "medium", "high", "critical"],
      issue_status: ["open", "in_progress", "resolved", "closed"],
      user_category: ["engemase_employee", "third_party", "socios"],
      user_role: ["admin", "employee", "third_party"],
    },
  },
} as const
