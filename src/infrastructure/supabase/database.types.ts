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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      adjustment_allocations: {
        Row: {
          adjustment_id: string
          amount_sen: number
          bill_id: string
          created_at: string
          id: string
          participant_id: string
          percentage_basis_points: number | null
          remainder_sen: number
          updated_at: string
        }
        Insert: {
          adjustment_id: string
          amount_sen: number
          bill_id: string
          created_at?: string
          id?: string
          participant_id: string
          percentage_basis_points?: number | null
          remainder_sen?: number
          updated_at?: string
        }
        Update: {
          adjustment_id?: string
          amount_sen?: number
          bill_id?: string
          created_at?: string
          id?: string
          participant_id?: string
          percentage_basis_points?: number | null
          remainder_sen?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_allocations_bill_id_adjustment_id_fkey"
            columns: ["bill_id", "adjustment_id"]
            isOneToOne: false
            referencedRelation: "bill_adjustments"
            referencedColumns: ["bill_id", "id"]
          },
          {
            foreignKeyName: "adjustment_allocations_bill_id_participant_id_fkey"
            columns: ["bill_id", "participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["bill_id", "id"]
          },
        ]
      }
      adjustment_applicable_items: {
        Row: {
          adjustment_id: string
          bill_id: string
          created_at: string
          item_id: string
        }
        Insert: {
          adjustment_id: string
          bill_id: string
          created_at?: string
          item_id: string
        }
        Update: {
          adjustment_id?: string
          bill_id?: string
          created_at?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_applicable_items_bill_id_adjustment_id_fkey"
            columns: ["bill_id", "adjustment_id"]
            isOneToOne: false
            referencedRelation: "bill_adjustments"
            referencedColumns: ["bill_id", "id"]
          },
          {
            foreignKeyName: "adjustment_applicable_items_bill_id_item_id_fkey"
            columns: ["bill_id", "item_id"]
            isOneToOne: false
            referencedRelation: "bill_items"
            referencedColumns: ["bill_id", "id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_participant_id: string | null
          actor_type: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          bill_id: string
          created_at: string
          event_type: string
          id: string
        }
        Insert: {
          actor_participant_id?: string | null
          actor_type: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          bill_id: string
          created_at?: string
          event_type: string
          id?: string
        }
        Update: {
          actor_participant_id?: string | null
          actor_type?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          bill_id?: string
          created_at?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_participant_id_fkey"
            columns: ["actor_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_adjustments: {
        Row: {
          allocation_method: string
          amount_sen: number
          amount_source: string
          applies_to_all_items: boolean
          bill_id: string
          calculation_base_mode: string | null
          calculation_method: string
          created_at: string
          id: string
          label: string
          manual_amount_sen: number | null
          rate_basis_points: number | null
          rounding_mode: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          allocation_method?: string
          amount_sen: number
          amount_source?: string
          applies_to_all_items?: boolean
          bill_id: string
          calculation_base_mode?: string | null
          calculation_method?: string
          created_at?: string
          id?: string
          label: string
          manual_amount_sen?: number | null
          rate_basis_points?: number | null
          rounding_mode?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          allocation_method?: string
          amount_sen?: number
          amount_source?: string
          applies_to_all_items?: boolean
          bill_id?: string
          calculation_base_mode?: string | null
          calculation_method?: string
          created_at?: string
          id?: string
          label?: string
          manual_amount_sen?: number | null
          rate_basis_points?: number | null
          rounding_mode?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_adjustments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          description: string
          id: string
          line_total_sen: number
          manual_line_total_sen: number | null
          quantity: number
          sort_order: number
          unit_price_sen: number
          updated_at: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          description: string
          id?: string
          line_total_sen: number
          manual_line_total_sen?: number | null
          quantity?: number
          sort_order?: number
          unit_price_sen?: number
          updated_at?: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          description?: string
          id?: string
          line_total_sen?: number
          manual_line_total_sen?: number | null
          quantity?: number
          sort_order?: number
          unit_price_sen?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          archived_at: string | null
          created_at: string
          currency: string
          finalised_at: string | null
          id: string
          merchant_name: string | null
          owner_user_id: string
          printed_total_sen: number
          receipt_date: string | null
          row_version: number
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          currency?: string
          finalised_at?: string | null
          id?: string
          merchant_name?: string | null
          owner_user_id: string
          printed_total_sen?: number
          receipt_date?: string | null
          row_version?: number
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          currency?: string
          finalised_at?: string | null
          id?: string
          merchant_name?: string | null
          owner_user_id?: string
          printed_total_sen?: number
          receipt_date?: string | null
          row_version?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      item_allocations: {
        Row: {
          allocation_type: string
          amount_sen: number
          bill_id: string
          created_at: string
          id: string
          item_id: string
          participant_id: string
          percentage_basis_points: number | null
          quantity_share: number | null
          remainder_sen: number
          updated_at: string
        }
        Insert: {
          allocation_type: string
          amount_sen: number
          bill_id: string
          created_at?: string
          id?: string
          item_id: string
          participant_id: string
          percentage_basis_points?: number | null
          quantity_share?: number | null
          remainder_sen?: number
          updated_at?: string
        }
        Update: {
          allocation_type?: string
          amount_sen?: number
          bill_id?: string
          created_at?: string
          id?: string
          item_id?: string
          participant_id?: string
          percentage_basis_points?: number | null
          quantity_share?: number | null
          remainder_sen?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_allocations_bill_id_item_id_fkey"
            columns: ["bill_id", "item_id"]
            isOneToOne: false
            referencedRelation: "bill_items"
            referencedColumns: ["bill_id", "id"]
          },
          {
            foreignKeyName: "item_allocations_bill_id_participant_id_fkey"
            columns: ["bill_id", "participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["bill_id", "id"]
          },
        ]
      }
      participants: {
        Row: {
          bill_id: string
          color_token: string | null
          created_at: string
          display_name: string
          id: string
          is_owner: boolean
          linked_user_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          bill_id: string
          color_token?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_owner?: boolean
          linked_user_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bill_id?: string
          color_token?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_owner?: boolean
          linked_user_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_bill_adjustment: {
        Args: {
          p_amount_sen: number
          p_bill_id: string
          p_label: string
          p_type: string
        }
        Returns: {
          adjustment_id: string
        }[]
      }
      add_bill_item: {
        Args: {
          p_bill_id: string
          p_description: string
          p_line_total_sen: number
          p_quantity: number
          p_unit_price_sen: number
        }
        Returns: {
          item_id: string
        }[]
      }
      add_bill_participant: {
        Args: { p_bill_id: string; p_display_name: string }
        Returns: {
          participant_id: string
        }[]
      }
      add_bill_rate_adjustment: {
        Args: {
          p_applicable_item_ids: string[]
          p_applies_to_all_items: boolean
          p_bill_id: string
          p_calculation_base_mode: string
          p_label: string
          p_rate_basis_points: number
          p_rounding_mode: string
          p_type: string
        }
        Returns: {
          adjustment_id: string
          calculated_amount_sen: number
        }[]
      }
      add_bill_rounding_adjustment: {
        Args: { p_amount_sen: number; p_bill_id: string }
        Returns: {
          adjustment_id: string
        }[]
      }
      create_draft_bill: {
        Args: {
          p_merchant_name?: string
          p_owner_display_name?: string
          p_printed_total_sen?: number
        }
        Returns: {
          bill_id: string
          owner_participant_id: string
        }[]
      }
      is_bill_owner: { Args: { target_bill_id: string }; Returns: boolean }
      remove_bill_adjustment: {
        Args: { p_adjustment_id: string; p_bill_id: string }
        Returns: {
          removed_adjustment_id: string
        }[]
      }
      update_bill_printed_total: {
        Args: {
          p_bill_id: string
          p_expected_row_version: number
          p_printed_total_sen: number
        }
        Returns: {
          updated_row_version: number
        }[]
      }
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
  public: {
    Enums: {},
  },
} as const
