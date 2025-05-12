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
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          tenant_id: string
          role: 'school_admin' | 'student' | 'superuser'
        }
        Insert: {
          id?: string
          email: string
          tenant_id: string
          role: 'school_admin' | 'student' | 'superuser'
        }
        Update: {
          id?: string
          email?: string
          tenant_id?: string
          role?: 'school_admin' | 'student' | 'superuser'
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      competitions: {
        Row: {
          id: string
          title: string
          description: string | null
          visibility: 'public' | 'private' | 'restricted'
          tenant_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          visibility?: 'public' | 'private' | 'restricted'
          tenant_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          visibility?: 'public' | 'private' | 'restricted'
          tenant_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      competition_allowed_schools: {
        Row: {
          competition_id: string
          school_id: string
        }
        Insert: {
          competition_id: string
          school_id: string
        }
        Update: {
          competition_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_allowed_schools_competition_id_fkey"
            columns: ["competition_id"]
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_allowed_schools_school_id_fkey"
            columns: ["school_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      visibility_enum: 'public' | 'private' | 'restricted'
    }
  }
}

// Helper types for Supabase specific features
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
