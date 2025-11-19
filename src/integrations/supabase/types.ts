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
      content_flags: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          description: string | null
          flagged_by: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          description?: string | null
          flagged_by: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          description?: string | null
          flagged_by?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          notes: string | null
          reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_applications: {
        Row: {
          age: number
          bio: string
          categories: string[] | null
          content_type: string
          created_at: string | null
          date_of_birth: string
          display_name: string
          email: string
          government_id_url: string | null
          id: string
          languages: string[] | null
          location: string | null
          phone: string | null
          profile_photo_url: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_media: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age: number
          bio: string
          categories?: string[] | null
          content_type: string
          created_at?: string | null
          date_of_birth: string
          display_name: string
          email: string
          government_id_url?: string | null
          id?: string
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number
          bio?: string
          categories?: string[] | null
          content_type?: string
          created_at?: string | null
          date_of_birth?: string
          display_name?: string
          email?: string
          government_id_url?: string | null
          id?: string
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          application_note: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          pending_balance: number | null
          status: string
          total_earned: number | null
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          application_note?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          pending_balance?: number | null
          status?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          application_note?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          pending_balance?: number | null
          status?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          file_url: string
          id: string
          is_premium: boolean | null
          price: number
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          file_url: string
          id?: string
          is_premium?: boolean | null
          price?: number
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          file_url?: string
          id?: string
          is_premium?: boolean | null
          price?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      media_purchases: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          media_id: string
          price_paid: number
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          media_id: string
          price_paid: number
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          media_id?: string
          price_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_purchases_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          creator_id: string | null
          delivered_at: string | null
          delivery_status: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          text: string
          type: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          creator_id?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          text: string
          type?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          creator_id?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          text?: string
          type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          plan_id: string | null
          reference: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          plan_id?: string | null
          reference: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          plan_id?: string | null
          reference?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          profile_id: string
          rating: number
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          profile_id: string
          rating: number
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number
          basename: string | null
          bio: string | null
          cover_image: string | null
          created_at: string | null
          display_name: string
          id: string
          is_online: boolean | null
          last_activity_at: string | null
          last_seen: string | null
          location: string | null
          price: number | null
          profile_image: string | null
          rating: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          age: number
          basename?: string | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          display_name: string
          id: string
          is_online?: boolean | null
          last_activity_at?: string | null
          last_seen?: string | null
          location?: string | null
          price?: number | null
          profile_image?: string | null
          rating?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          age?: number
          basename?: string | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_online?: boolean | null
          last_activity_at?: string | null
          last_seen?: string | null
          location?: string | null
          price?: number | null
          profile_image?: string | null
          rating?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          creator_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          subscriber_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          subscriber_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          file_url: string
          id: string
          is_premium: boolean | null
          price: number | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_url: string
          id?: string
          is_premium?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_url?: string
          id?: string
          is_premium?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          commission: number
          created_at: string
          error_message: string | null
          id: string
          net_amount: number
          recipient_code: string
          reference: string
          status: string
          transfer_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          commission: number
          created_at?: string
          error_message?: string | null
          id?: string
          net_amount: number
          recipient_code: string
          reference: string
          status?: string
          transfer_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          error_message?: string | null
          id?: string
          net_amount?: number
          recipient_code?: string
          reference?: string
          status?: string
          transfer_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      debit_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      get_unread_senders_count: { Args: { p_user_id: string }; Returns: number }
      handle_wallet_auth: {
        Args: {
          p_basename?: string
          p_display_name?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      send_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      update_my_activity: { Args: never; Returns: undefined }
      update_user_online_status: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "creator" | "admin"
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
      app_role: ["user", "creator", "admin"],
    },
  },
} as const
