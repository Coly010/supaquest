export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      chat_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_logs: {
        Row: {
          attacker_id: string
          created_at: string
          credits_gained: number
          damage_dealt: number
          damage_taken: number
          defender_id: string
          defender_type: string
          id: string
          loot: Json | null
          outcome: string
          xp_gained: number
        }
        Insert: {
          attacker_id: string
          created_at?: string
          credits_gained?: number
          damage_dealt?: number
          damage_taken?: number
          defender_id: string
          defender_type: string
          id?: string
          loot?: Json | null
          outcome: string
          xp_gained?: number
        }
        Update: {
          attacker_id?: string
          created_at?: string
          credits_gained?: number
          damage_dealt?: number
          damage_taken?: number
          defender_id?: string
          defender_type?: string
          id?: string
          loot?: Json | null
          outcome?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "combat_logs_attacker_id_fkey"
            columns: ["attacker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gem_definitions: {
        Row: {
          base_value: number
          description: string
          gem_type: string
          id: string
          metadata: Json
          name: string
          stat_bonus: Json
          tier: number
        }
        Insert: {
          base_value?: number
          description?: string
          gem_type: string
          id: string
          metadata?: Json
          name: string
          stat_bonus?: Json
          tier?: number
        }
        Update: {
          base_value?: number
          description?: string
          gem_type?: string
          id?: string
          metadata?: Json
          name?: string
          stat_bonus?: Json
          tier?: number
        }
        Relationships: []
      }
      inventory_gems: {
        Row: {
          gem_def_id: string
          id: string
          inventory_id: string
          slot_index: number
          socketed_at: string
        }
        Insert: {
          gem_def_id: string
          id?: string
          inventory_id: string
          slot_index: number
          socketed_at?: string
        }
        Update: {
          gem_def_id?: string
          id?: string
          inventory_id?: string
          slot_index?: number
          socketed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_gems_gem_def_id_fkey"
            columns: ["gem_def_id"]
            isOneToOne: false
            referencedRelation: "gem_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_gems_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "player_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      item_definitions: {
        Row: {
          base_stats: Json
          base_value: number
          description: string
          gem_slot_count: number
          id: string
          item_type: string
          level_required: number
          max_stack: number | null
          metadata: Json
          name: string
          slot: string | null
          stackable: boolean
        }
        Insert: {
          base_stats?: Json
          base_value?: number
          description?: string
          gem_slot_count?: number
          id: string
          item_type: string
          level_required?: number
          max_stack?: number | null
          metadata?: Json
          name: string
          slot?: string | null
          stackable?: boolean
        }
        Update: {
          base_stats?: Json
          base_value?: number
          description?: string
          gem_slot_count?: number
          id?: string
          item_type?: string
          level_required?: number
          max_stack?: number | null
          metadata?: Json
          name?: string
          slot?: string | null
          stackable?: boolean
        }
        Relationships: []
      }
      npc_area_spawns: {
        Row: {
          area_id: string
          npc_def_id: string
          spawn_weight: number
        }
        Insert: {
          area_id: string
          npc_def_id: string
          spawn_weight?: number
        }
        Update: {
          area_id?: string
          npc_def_id?: string
          spawn_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "npc_area_spawns_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "npc_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_area_spawns_npc_def_id_fkey"
            columns: ["npc_def_id"]
            isOneToOne: false
            referencedRelation: "npc_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_areas: {
        Row: {
          description: string
          id: string
          level_range: number[]
          name: string
        }
        Insert: {
          description?: string
          id: string
          level_range?: number[]
          name: string
        }
        Update: {
          description?: string
          id?: string
          level_range?: number[]
          name?: string
        }
        Relationships: []
      }
      npc_definitions: {
        Row: {
          credits_reward: number[]
          description: string
          gem_loot_table: Json | null
          id: string
          level: number
          loot_table: Json
          name: string
          stats: Json
          uptime: number
          xp_reward: number
        }
        Insert: {
          credits_reward?: number[]
          description?: string
          gem_loot_table?: Json | null
          id: string
          level?: number
          loot_table?: Json
          name: string
          stats?: Json
          uptime?: number
          xp_reward?: number
        }
        Update: {
          credits_reward?: number[]
          description?: string
          gem_loot_table?: Json | null
          id?: string
          level?: number
          loot_table?: Json
          name?: string
          stats?: Json
          uptime?: number
          xp_reward?: number
        }
        Relationships: []
      }
      player_inventory: {
        Row: {
          acquired_at: string
          equipped_slot: string | null
          id: string
          is_equipped: boolean
          item_def_id: string
          player_id: string
          quantity: number
        }
        Insert: {
          acquired_at?: string
          equipped_slot?: string | null
          id?: string
          is_equipped?: boolean
          item_def_id: string
          player_id: string
          quantity?: number
        }
        Update: {
          acquired_at?: string
          equipped_slot?: string | null
          id?: string
          is_equipped?: boolean
          item_def_id?: string
          player_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_item_def_id_fkey"
            columns: ["item_def_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_inventory_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_resources: {
        Row: {
          current: number
          last_replenish: string
          maximum: number | null
          player_id: string
          resource_type: string
        }
        Insert: {
          current: number
          last_replenish?: string
          maximum?: number | null
          player_id: string
          resource_type: string
        }
        Update: {
          current?: number
          last_replenish?: string
          maximum?: number | null
          player_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_resources_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_skills: {
        Row: {
          level: number
          player_id: string
          skill_id: string
          xp: number
          xp_to_next: number
        }
        Insert: {
          level?: number
          player_id: string
          skill_id: string
          xp?: number
          xp_to_next?: number
        }
        Update: {
          level?: number
          player_id?: string
          skill_id?: string
          xp?: number
          xp_to_next?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_skills_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          logic: number
          max_uptime: number
          player_id: string
          resilience: number
          serendipity: number
          throughput: number
        }
        Insert: {
          logic?: number
          max_uptime?: number
          player_id: string
          resilience?: number
          serendipity?: number
          throughput?: number
        }
        Update: {
          logic?: number
          max_uptime?: number
          player_id?: string
          resilience?: number
          serendipity?: number
          throughput?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          level: number
          updated_at: string
          username: string
          xp: number
          xp_to_next: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          level?: number
          updated_at?: string
          username: string
          xp?: number
          xp_to_next?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          level?: number
          updated_at?: string
          username?: string
          xp?: number
          xp_to_next?: number
        }
        Relationships: []
      }
      shop_inventory: {
        Row: {
          item_def_id: string
          price_buy: number
          price_sell: number
          shop_id: string
          stock: number | null
        }
        Insert: {
          item_def_id: string
          price_buy: number
          price_sell: number
          shop_id: string
          stock?: number | null
        }
        Update: {
          item_def_id?: string
          price_buy?: number
          price_sell?: number
          shop_id?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_inventory_item_def_id_fkey"
            columns: ["item_def_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          description: string
          id: string
          name: string
        }
        Insert: {
          description?: string
          id: string
          name: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_definitions: {
        Row: {
          description: string
          failure_penalty: Json | null
          focus_cost: number
          gem_rewards: Json | null
          id: string
          level_required: number
          name: string
          rewards: Json
          skill_id: string
          success_rate: number
        }
        Insert: {
          description?: string
          failure_penalty?: Json | null
          focus_cost?: number
          gem_rewards?: Json | null
          id: string
          level_required?: number
          name: string
          rewards?: Json
          skill_id: string
          success_rate?: number
        }
        Update: {
          description?: string
          failure_penalty?: Json | null
          focus_cost?: number
          gem_rewards?: Json | null
          id?: string
          level_required?: number
          name?: string
          rewards?: Json
          skill_id?: string
          success_rate?: number
        }
        Relationships: []
      }
      task_logs: {
        Row: {
          created_at: string
          id: string
          outcome: string
          player_id: string
          rewards_given: Json
          task_def_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          player_id: string
          rewards_given?: Json
          task_def_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          player_id?: string
          rewards_given?: Json
          task_def_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_task_def_id_fkey"
            columns: ["task_def_id"]
            isOneToOne: false
            referencedRelation: "task_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_item: {
        Args: { p_item_def_id: string; p_player_id: string; p_shop_id: string }
        Returns: number
      }
      replenish_all_focus: { Args: never; Returns: undefined }
      replenish_player_focus: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      sell_item: {
        Args: { p_inventory_id: string; p_player_id: string }
        Returns: number
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

