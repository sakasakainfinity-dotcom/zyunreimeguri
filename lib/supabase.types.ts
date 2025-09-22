export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      missions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          color: string | null;
          sort_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          color?: string | null;
          sort_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          color?: string | null;
          sort_index?: number;
          created_at?: string;
        };
      };
      places: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          prefecture: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          latitude: number;
          longitude: number;
          prefecture?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          prefecture?: string | null;
          address?: string | null;
          created_at?: string;
        };
      };
      mission_places: {
        Row: {
          id: string;
          mission_id: string;
          place_id: string;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          mission_id: string;
          place_id: string;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          mission_id?: string;
          place_id?: string;
          order_index?: number | null;
        };
      };
      visits: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          visited_at: string | null;
          note: string | null;
          photos_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          place_id: string;
          visited_at?: string | null;
          note?: string | null;
          photos_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          place_id?: string;
          visited_at?: string | null;
          note?: string | null;
          photos_count?: number;
          created_at?: string;
        };
      };
      visit_photos: {
        Row: {
          id: string;
          visit_id: string;
          path: string;
          created_at: string;
          storage_bucket: string;
          mime_type: string | null;
        };
        Insert: {
          id?: string;
          visit_id: string;
          path: string;
          storage_bucket?: string;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          path?: string;
          storage_bucket?: string;
          mime_type?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          target_type: 'visit' | 'place';
          target_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: 'visit' | 'place';
          target_id: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_type?: 'visit' | 'place';
          target_id?: string;
          reason?: string;
          created_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          condition: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          condition: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          condition?: Json;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          unlocked_at?: string;
        };
      };
      certificates: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          image_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          image_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mission_id?: string;
          image_path?: string;
          created_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
