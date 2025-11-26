export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          display_order: number;
          icon_name: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          icon_name: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          icon_name?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flyers: {
        Row: {
          created_at: string;
          id: string;
          status: Database["public"]["Enums"]["flyer_status"];
          store_id: string;
          updated_at: string;
          valid_from: string;
          valid_to: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["flyer_status"];
          store_id: string;
          updated_at?: string;
          valid_from: string;
          valid_to: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["flyer_status"];
          store_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flyers_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flyers_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "v_active_products";
            referencedColumns: ["store_id"];
          },
        ];
      };
      pages: {
        Row: {
          ai_raw_response: Json | null;
          created_at: string;
          error_details: string | null;
          flyer_id: string;
          id: string;
          image_height: number | null;
          image_path: string;
          image_width: number | null;
          page_number: number;
          processing_started_at: string | null;
          processing_status: Database["public"]["Enums"]["page_processing_status"];
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          ai_raw_response?: Json | null;
          created_at?: string;
          error_details?: string | null;
          flyer_id: string;
          id?: string;
          image_height?: number | null;
          image_path: string;
          image_width?: number | null;
          page_number: number;
          processing_started_at?: string | null;
          processing_status?: Database["public"]["Enums"]["page_processing_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          ai_raw_response?: Json | null;
          created_at?: string;
          error_details?: string | null;
          flyer_id?: string;
          id?: string;
          image_height?: number | null;
          image_path?: string;
          image_width?: number | null;
          page_number?: number;
          processing_started_at?: string | null;
          processing_status?: Database["public"]["Enums"]["page_processing_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pages_flyer_id_fkey";
            columns: ["flyer_id"];
            isOneToOne: false;
            referencedRelation: "flyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pages_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          bounding_box: Json | null;
          category_id: string;
          conditions: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          page_id: string;
          price_promo: number;
          price_regular: number | null;
          search_vector: unknown;
          updated_at: string;
        };
        Insert: {
          bounding_box?: Json | null;
          category_id: string;
          conditions?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          page_id: string;
          price_promo: number;
          price_regular?: number | null;
          search_vector?: unknown;
          updated_at?: string;
        };
        Update: {
          bounding_box?: Json | null;
          category_id?: string;
          conditions?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          page_id?: string;
          price_promo?: number;
          price_regular?: number | null;
          search_vector?: unknown;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "v_active_products";
            referencedColumns: ["category_id"];
          },
          {
            foreignKeyName: "products_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_active_products: {
        Row: {
          category_icon: string | null;
          category_id: string | null;
          category_name: string | null;
          conditions: string | null;
          created_at: string | null;
          description: string | null;
          page_image_path: string | null;
          price_promo: number | null;
          price_regular: number | null;
          product_id: string | null;
          product_name: string | null;
          store_id: string | null;
          store_logo: string | null;
          store_name: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      search_products: {
        Args: { search_query: string; similarity_threshold?: number };
        Returns: {
          description: string;
          price_promo: number;
          product_id: string;
          product_name: string;
          similarity_score: number;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      flyer_status: "draft" | "active" | "archived";
      page_processing_status: "pending" | "processing" | "processed" | "verified" | "error" | "no_products";
      user_role: "admin" | "user";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      flyer_status: ["draft", "active", "archived"],
      page_processing_status: ["pending", "processing", "processed", "verified", "error", "no_products"],
      user_role: ["admin", "user"],
    },
  },
} as const;
