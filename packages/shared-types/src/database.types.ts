/**
 * GENERATED from the live Supabase project (rylceydkrydmpysmibba).
 * Regenerate with:
 *   npx supabase gen types typescript --project-id rylceydkrydmpysmibba --schema public \
 *     > packages/shared-types/src/database.types.ts
 */
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
      appointments: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          patient_id: string
          qr_code: string | null
          slot_id: string | null
          slot_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          qr_code?: string | null
          slot_id?: string | null
          slot_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          qr_code?: string | null
          slot_id?: string | null
          slot_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "doctor_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          record_id: string | null
          staff_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          record_id?: string | null
          staff_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          record_id?: string | null
          staff_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      doctor_slots: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          is_booked: boolean | null
          slot_time: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          is_booked?: boolean | null
          slot_time: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_booked?: boolean | null
          slot_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          qualification: string | null
          specialization: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id: string
          qualification?: string | null
          specialization?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          qualification?: string | null
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          claim_amount: number | null
          id: string
          payment_id: string
          policy_number: string | null
          provider: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["claim_status"] | null
          submitted_at: string | null
        }
        Insert: {
          claim_amount?: number | null
          id?: string
          payment_id: string
          policy_number?: string | null
          provider?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          submitted_at?: string | null
        }
        Update: {
          claim_amount?: number | null
          id?: string
          payment_id?: string
          policy_number?: string | null
          provider?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          stock_qty: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          stock_qty?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          stock_qty?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          completed_at: string | null
          id: string
          instructions: string | null
          ordered_at: string | null
          patient_id: string
          result_notes: string | null
          result_url: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          type: Database["public"]["Enums"]["order_type"]
          visit_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          instructions?: string | null
          ordered_at?: string | null
          patient_id: string
          result_notes?: string | null
          result_url?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          type: Database["public"]["Enums"]["order_type"]
          visit_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          instructions?: string | null
          ordered_at?: string | null
          patient_id?: string
          result_notes?: string | null
          result_url?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          type?: Database["public"]["Enums"]["order_type"]
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          abha_id: string | null
          address: string | null
          auth_user_id: string | null
          created_at: string | null
          dob: string | null
          email: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          abha_id?: string | null
          address?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
        }
        Update: {
          abha_id?: string | null
          address?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string | null
          patient_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          visit_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method?: string | null
          patient_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          visit_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string | null
          patient_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          dispensed_at: string | null
          dosage: string | null
          duration: string | null
          id: string
          medicine_id: string
          patient_id: string
          quantity: number
          status: Database["public"]["Enums"]["prescription_status"] | null
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          dispensed_at?: string | null
          dosage?: string | null
          duration?: string | null
          id?: string
          medicine_id: string
          patient_id: string
          quantity: number
          status?: Database["public"]["Enums"]["prescription_status"] | null
          visit_id: string
        }
        Update: {
          created_at?: string | null
          dispensed_at?: string | null
          dosage?: string | null
          duration?: string | null
          id?: string
          medicine_id?: string
          patient_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["prescription_status"] | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          file_url: string | null
          generated_at: string | null
          id: string
          patient_id: string
          type: string | null
          visit_id: string
        }
        Insert: {
          file_url?: string | null
          generated_at?: string | null
          id?: string
          patient_id: string
          type?: string | null
          visit_id: string
        }
        Update: {
          file_url?: string | null
          generated_at?: string | null
          id?: string
          patient_id?: string
          type?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          appointment_id: string | null
          chief_complaint: string | null
          completed_at: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          appointment_id?: string | null
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          appointment_id?: string | null
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_appointment: {
        Args: { p_slot_id: string }
        Returns: string
      }
      current_patient_id: { Args: never; Returns: string }
      current_staff_id: { Args: never; Returns: string }
      current_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      dispense_medicine: {
        Args: { p_prescription_id: string; p_quantity: number }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | "booked"
        | "checked_in"
        | "in_consultation"
        | "completed"
        | "no_show"
        | "cancelled"
      claim_status: "submitted" | "approved" | "rejected" | "pending_review"
      order_status: "ordered" | "in_progress" | "completed"
      order_type: "lab" | "ct" | "mri" | "xray"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      prescription_status: "pending" | "dispensed"
      staff_role: "reception" | "doctor" | "lab_tech" | "pharmacist" | "admin"
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
      appointment_status: [
        "booked",
        "checked_in",
        "in_consultation",
        "completed",
        "no_show",
        "cancelled",
      ],
      claim_status: ["submitted", "approved", "rejected", "pending_review"],
      order_status: ["ordered", "in_progress", "completed"],
      order_type: ["lab", "ct", "mri", "xray"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      prescription_status: ["pending", "dispensed"],
      staff_role: ["reception", "doctor", "lab_tech", "pharmacist", "admin"],
    },
  },
} as const
