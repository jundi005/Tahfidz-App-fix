
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          created_at: string
          name: string
          logo_url: string | null
          address: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string
          logo_url?: string | null
          address?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          logo_url?: string | null
          address?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          full_name: string | null
          role: string
          email: string | null 
        }
        Insert: {
          id: string
          organization_id?: string | null
          full_name?: string | null
          role?: string
          email?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          full_name?: string | null
          role?: string
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance: {
        Row: {
          id: number
          organization_id: string
          created_at: string | null
          date: string
          halaqah_id: number | null
          peran: Database["public"]["Enums"]["peran_enum"]
          person_id: number
          status: Database["public"]["Enums"]["attendance_status_enum"]
          waktu: Database["public"]["Enums"]["waktu_enum"]
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string | null
          date: string
          halaqah_id?: number | null
          peran: Database["public"]["Enums"]["peran_enum"]
          person_id: number
          status: Database["public"]["Enums"]["attendance_status_enum"]
          waktu: Database["public"]["Enums"]["waktu_enum"]
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string | null
          date?: string
          halaqah_id?: number | null
          peran?: Database["public"]["Enums"]["peran_enum"]
          person_id?: number
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          waktu?: Database["public"]["Enums"]["waktu_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_halaqah_id_fkey"
            columns: ["halaqah_id"]
            isOneToOne: false
            referencedRelation: "halaqah"
            referencedColumns: ["id"]
          },
        ]
      }
      student_evaluation: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          santri_id: number
          month_key: string
          kualitas_hafalan: string | null
          kualitas_bacaan: string | null
          sikap_prilaku: string | null
          catatan_musammi: string | null
          catatan_muroqib: string | null
          catatan_lajnah: string | null
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          santri_id: number
          month_key: string
          kualitas_hafalan?: string | null
          kualitas_bacaan?: string | null
          sikap_prilaku?: string | null
          catatan_musammi?: string | null
          catatan_muroqib?: string | null
          catatan_lajnah?: string | null
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          santri_id?: number
          month_key?: string
          kualitas_hafalan?: string | null
          kualitas_bacaan?: string | null
          sikap_prilaku?: string | null
          catatan_musammi?: string | null
          catatan_muroqib?: string | null
          catatan_lajnah?: string | null
        }
        Relationships: [
            {
                foreignKeyName: "student_evaluation_santri_id_fkey"
                columns: ["santri_id"]
                isOneToOne: false
                referencedRelation: "santri"
                referencedColumns: ["id"]
            }
        ]
      }
      evaluation_settings: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          category: string
          label: string
          score: number | null
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          category: string
          label: string
          score?: number | null
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          category?: string
          label?: string
          score?: number | null
        }
        Relationships: []
      }
      // ... (Existing tables omitted for brevity but remain unchanged) ...
      chat: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          content: string
          sender_email: string
          is_deleted: boolean
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          content: string
          sender_email: string
          is_deleted?: boolean
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          content?: string
          sender_email?: string
          is_deleted?: boolean
        }
        Relationships: []
      }
      halaqah: {
        Row: {
          id: number
          organization_id: string
          created_at: string | null
          jenis: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          musammi_id: number | null
          nama: string
          waktu: Database["public"]["Enums"]["waktu_enum"][]
          no_urut: number
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string | null
          jenis: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          musammi_id?: number | null
          nama: string
          waktu: Database["public"]["Enums"]["waktu_enum"][]
          no_urut?: number
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string | null
          jenis?: string
          marhalah?: Database["public"]["Enums"]["marhalah_enum"]
          musammi_id?: number | null
          nama?: string
          waktu?: Database["public"]["Enums"]["waktu_enum"][]
          no_urut?: number
        }
        Relationships: [
          {
            foreignKeyName: "halaqah_musammi_id_fkey"
            columns: ["musammi_id"]
            isOneToOne: false
            referencedRelation: "musammi"
            referencedColumns: ["id"]
          },
        ]
      }
      halaqah_santri: {
        Row: {
          organization_id: string
          halaqah_id: number
          santri_id: number
        }
        Insert: {
          organization_id: string
          halaqah_id: number
          santri_id: number
        }
        Update: {
          organization_id?: string
          halaqah_id?: number
          santri_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "halaqah_santri_halaqah_id_fkey"
            columns: ["halaqah_id"]
            isOneToOne: false
            referencedRelation: "halaqah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halaqah_santri_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
        ]
      }
      informasi: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          title: string
          content: string
          author_email: string | null
          is_pinned: boolean
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          title: string
          content: string
          author_email?: string | null
          is_pinned?: boolean
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          title?: string
          content?: string
          author_email?: string | null
          is_pinned?: boolean
        }
        Relationships: []
      }
      musammi: {
        Row: {
          id: number
          organization_id: string
          created_at: string | null
          kode: string | null
          kelas: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          nama: string
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string | null
          kode?: string | null
          kelas: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          nama: string
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string | null
          kode?: string | null
          kelas?: string
          marhalah?: Database["public"]["Enums"]["marhalah_enum"]
          nama?: string
        }
        Relationships: []
      }
      santri: {
        Row: {
          id: number
          organization_id: string
          created_at: string | null
          kode: string | null
          kelas: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          nama: string
          nama_wali: string | null
          no_hp_wali: string | null
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string | null
          kode?: string | null
          kelas: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          nama: string
          nama_wali?: string | null
          no_hp_wali?: string | null
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string | null
          kode?: string | null
          kelas: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          nama: string
          nama_wali?: string | null
          no_hp_wali?: string | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
            id: number
            organization_id: string
            created_at: string
            santri_id: number
            month_key: string 
            progress_type: string
            value: string
        }
        Insert: {
            id?: number
            organization_id: string
            created_at?: string
            santri_id: number
            month_key: string
            progress_type: string
            value: string
        }
        Update: {
            id?: number
            organization_id?: string
            created_at?: string
            santri_id?: number
            month_key?: string
            progress_type?: string
            value?: string
        }
        Relationships: [
            {
                foreignKeyName: "student_progress_santri_id_fkey"
                columns: ["santri_id"]
                isOneToOne: false
                referencedRelation: "santri"
                referencedColumns: ["id"]
            }
        ]
      }
      wali_kelas: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          nama: string
          marhalah: string
          kelas: string
          no_hp: string | null
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          nama: string
          marhalah: string
          kelas: string
          no_hp?: string | null
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          nama?: string
          marhalah?: string
          kelas?: string
          no_hp?: string | null
        }
        Relationships: []
      }
      class_targets: {
        Row: {
          id: number
          organization_id: string
          created_at: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          kelas: string
          target_ziyadah_start: number
          target_ziyadah_end: number
          target_murojaah_start: number
          target_murojaah_end: number
          target_hafalan_start: number
          target_hafalan_end: number
        }
        Insert: {
          id?: number
          organization_id: string
          created_at?: string
          marhalah: Database["public"]["Enums"]["marhalah_enum"]
          kelas: string
          target_ziyadah_start: number
          target_ziyadah_end: number
          target_murojaah_start: number
          target_murojaah_end: number
          target_hafalan_start: number
          target_hafalan_end: number
        }
        Update: {
          id?: number
          organization_id?: string
          created_at?: string
          marhalah?: Database["public"]["Enums"]["marhalah_enum"]
          kelas?: string
          target_ziyadah_start?: number
          target_ziyadah_end?: number
          target_murojaah_start?: number
          target_murojaah_end?: number
          target_hafalan_start?: number
          target_hafalan_end?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attendance_status_enum:
        | "Hadir"
        | "Izin"
        | "Sakit"
        | "Alpa"
        | "Terlambat"
      halaqah_type_enum: "Halaqah Utama" | "Halaqah Pagi" 
      marhalah_enum: "Mutawassithah" | "Aliyah" | "Jamiah"
      peran_enum: "Santri" | "Musammi"
      waktu_enum: "Shubuh" | "Dhuha" | "Ashar" | "Isya"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
