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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          exam_id: string
          id: string
          question_id: string
          sort_order: number
        }
        Insert: {
          exam_id: string
          id?: string
          question_id: string
          sort_order?: number
        }
        Update: {
          exam_id?: string
          id?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string
          exam_type: string
          id: string
          is_active: boolean
          password: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exam_type?: string
          id?: string
          is_active?: boolean
          password: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exam_type?: string
          id?: string
          is_active?: boolean
          password?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      question_doubts: {
        Row: {
          admin_response: string | null
          answered_at: string | null
          answered_by: string | null
          attempt_id: string | null
          created_at: string
          doubt_text: string
          exam_id: string | null
          exam_title: string
          id: string
          question_id: string
          question_number: number | null
          question_text_snapshot: string | null
          read_by_student: boolean
          status: Database["public"]["Enums"]["doubt_status"]
          student_email: string | null
          student_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          answered_at?: string | null
          answered_by?: string | null
          attempt_id?: string | null
          created_at?: string
          doubt_text: string
          exam_id?: string | null
          exam_title?: string
          id?: string
          question_id: string
          question_number?: number | null
          question_text_snapshot?: string | null
          read_by_student?: boolean
          status?: Database["public"]["Enums"]["doubt_status"]
          student_email?: string | null
          student_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          answered_at?: string | null
          answered_by?: string | null
          attempt_id?: string | null
          created_at?: string
          doubt_text?: string
          exam_id?: string | null
          exam_title?: string
          id?: string
          question_id?: string
          question_number?: number | null
          question_text_snapshot?: string | null
          read_by_student?: boolean
          status?: Database["public"]["Enums"]["doubt_status"]
          student_email?: string | null
          student_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          comment: string | null
          comment_image_url: string | null
          correct_option: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          comment_image_url?: string | null
          correct_option: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          comment_image_url?: string | null
          correct_option?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          video_url?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          exam_id: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          score: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exam_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exam_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      tea_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          student_answer: string | null
          sub_index: number
          tea_question_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          student_answer?: string | null
          sub_index: number
          tea_question_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          student_answer?: string | null
          sub_index?: number
          tea_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tea_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "tea_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tea_answers_tea_question_id_fkey"
            columns: ["tea_question_id"]
            isOneToOne: false
            referencedRelation: "tea_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tea_attempts: {
        Row: {
          completed_at: string | null
          correct_items: number
          created_at: string
          exam_id: string
          id: string
          score: number
          total_items: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_items?: number
          created_at?: string
          exam_id: string
          id?: string
          score?: number
          total_items?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_items?: number
          created_at?: string
          exam_id?: string
          id?: string
          score?: number
          total_items?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tea_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      tea_exam_questions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          question_order: number
          tea_question_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          question_order?: number
          tea_question_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          question_order?: number
          tea_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tea_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tea_exam_questions_tea_question_id_fkey"
            columns: ["tea_question_id"]
            isOneToOne: false
            referencedRelation: "tea_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tea_questions: {
        Row: {
          comment: string | null
          comment_image_url: string | null
          created_at: string
          id: string
          image_url: string | null
          question_text: string
          sub1_answer_key: string
          sub1_image_url: string | null
          sub1_text: string
          sub2_answer_key: string
          sub2_image_url: string | null
          sub2_text: string
          sub3_answer_key: string
          sub3_image_url: string | null
          sub3_text: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          comment_image_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text: string
          sub1_answer_key: string
          sub1_image_url?: string | null
          sub1_text: string
          sub2_answer_key: string
          sub2_image_url?: string | null
          sub2_text: string
          sub3_answer_key: string
          sub3_image_url?: string | null
          sub3_text: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          comment_image_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text?: string
          sub1_answer_key?: string
          sub1_image_url?: string | null
          sub1_text?: string
          sub2_answer_key?: string
          sub2_image_url?: string | null
          sub2_text?: string
          sub3_answer_key?: string
          sub3_image_url?: string | null
          sub3_text?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          active_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_session_id?: string
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
      get_bud5_ranking: {
        Args: never
        Returns: {
          score: number
          total_questions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_email_allowed: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
      doubt_status: "pending" | "answered" | "resolved" | "archived"
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
      app_role: ["admin", "student"],
      doubt_status: ["pending", "answered", "resolved", "archived"],
    },
  },
} as const
