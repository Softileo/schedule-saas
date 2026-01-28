export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1";
    };
    public: {
        Tables: {
            employee_absences: {
                Row: {
                    absence_type: Database["public"]["Enums"]["absence_type"];
                    created_at: string | null;
                    created_by: string | null;
                    employee_id: string;
                    end_date: string;
                    id: string;
                    is_paid: boolean | null;
                    notes: string | null;
                    organization_id: string;
                    start_date: string;
                    updated_at: string | null;
                };
                Insert: {
                    absence_type: Database["public"]["Enums"]["absence_type"];
                    created_at?: string | null;
                    created_by?: string | null;
                    employee_id: string;
                    end_date: string;
                    id?: string;
                    is_paid?: boolean | null;
                    notes?: string | null;
                    organization_id: string;
                    start_date: string;
                    updated_at?: string | null;
                };
                Update: {
                    absence_type?: Database["public"]["Enums"]["absence_type"];
                    created_at?: string | null;
                    created_by?: string | null;
                    employee_id?: string;
                    end_date?: string;
                    id?: string;
                    is_paid?: boolean | null;
                    notes?: string | null;
                    organization_id?: string;
                    start_date?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "employee_absences_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "employee_absences_employee_id_fkey";
                        columns: ["employee_id"];
                        isOneToOne: false;
                        referencedRelation: "employees";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "employee_absences_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            employee_preferences: {
                Row: {
                    can_work_holidays: boolean | null;
                    can_work_weekends: boolean | null;
                    created_at: string | null;
                    employee_id: string;
                    id: string;
                    max_hours_per_day: number | null;
                    max_hours_per_week: number | null;
                    notes: string | null;
                    preferred_days: number[] | null;
                    preferred_end_time: string | null;
                    preferred_start_time: string | null;
                    unavailable_days: number[] | null;
                    updated_at: string | null;
                };
                Insert: {
                    can_work_holidays?: boolean | null;
                    can_work_weekends?: boolean | null;
                    created_at?: string | null;
                    employee_id: string;
                    id?: string;
                    max_hours_per_day?: number | null;
                    max_hours_per_week?: number | null;
                    notes?: string | null;
                    preferred_days?: number[] | null;
                    preferred_end_time?: string | null;
                    preferred_start_time?: string | null;
                    unavailable_days?: number[] | null;
                    updated_at?: string | null;
                };
                Update: {
                    can_work_holidays?: boolean | null;
                    can_work_weekends?: boolean | null;
                    created_at?: string | null;
                    employee_id?: string;
                    id?: string;
                    max_hours_per_day?: number | null;
                    max_hours_per_week?: number | null;
                    notes?: string | null;
                    preferred_days?: number[] | null;
                    preferred_end_time?: string | null;
                    preferred_start_time?: string | null;
                    unavailable_days?: number[] | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "employee_preferences_employee_id_fkey";
                        columns: ["employee_id"];
                        isOneToOne: true;
                        referencedRelation: "employees";
                        referencedColumns: ["id"];
                    }
                ];
            };
            employees: {
                Row: {
                    color: string | null;
                    created_at: string | null;
                    custom_hours: number | null;
                    email: string | null;
                    employment_type:
                        | Database["public"]["Enums"]["employment_type"]
                        | null;
                    first_name: string;
                    id: string;
                    is_active: boolean | null;
                    last_name: string;
                    organization_id: string;
                    phone: string | null;
                    position: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    color?: string | null;
                    created_at?: string | null;
                    custom_hours?: number | null;
                    email?: string | null;
                    employment_type?:
                        | Database["public"]["Enums"]["employment_type"]
                        | null;
                    first_name: string;
                    id?: string;
                    is_active?: boolean | null;
                    last_name: string;
                    organization_id: string;
                    phone?: string | null;
                    position?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    color?: string | null;
                    created_at?: string | null;
                    custom_hours?: number | null;
                    email?: string | null;
                    employment_type?:
                        | Database["public"]["Enums"]["employment_type"]
                        | null;
                    first_name?: string;
                    id?: string;
                    is_active?: boolean | null;
                    last_name?: string;
                    organization_id?: string;
                    phone?: string | null;
                    position?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "employees_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            holidays_cache: {
                Row: {
                    country_code: string;
                    created_at: string | null;
                    holidays: Json;
                    id: string;
                    year: number;
                };
                Insert: {
                    country_code?: string;
                    created_at?: string | null;
                    holidays: Json;
                    id?: string;
                    year: number;
                };
                Update: {
                    country_code?: string;
                    created_at?: string | null;
                    holidays?: Json;
                    id?: string;
                    year?: number;
                };
                Relationships: [];
            };
            organization_members: {
                Row: {
                    created_at: string | null;
                    id: string;
                    organization_id: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    organization_id: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    organization_id?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "organization_members_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "organization_members_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            organization_settings: {
                Row: {
                    created_at: string | null;
                    custom_trading_sundays: string[] | null;
                    default_break_minutes: number;
                    default_shift_duration: number;
                    enable_trading_sundays: boolean | null;
                    id: string;
                    min_employees_per_shift: number | null;
                    opening_hours: Json | null;
                    organization_id: string;
                    store_close_time: string | null;
                    store_open_time: string | null;
                    trading_sundays_mode: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    custom_trading_sundays?: string[] | null;
                    default_break_minutes?: number;
                    default_shift_duration?: number;
                    enable_trading_sundays?: boolean | null;
                    id?: string;
                    min_employees_per_shift?: number | null;
                    opening_hours?: Json | null;
                    organization_id: string;
                    store_close_time?: string | null;
                    store_open_time?: string | null;
                    trading_sundays_mode?: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    custom_trading_sundays?: string[] | null;
                    default_break_minutes?: number;
                    default_shift_duration?: number;
                    enable_trading_sundays?: boolean | null;
                    id?: string;
                    min_employees_per_shift?: number | null;
                    opening_hours?: Json | null;
                    organization_id?: string;
                    store_close_time?: string | null;
                    store_open_time?: string | null;
                    trading_sundays_mode?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "organization_settings_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: true;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            organizations: {
                Row: {
                    created_at: string | null;
                    id: string;
                    industry_type: string | null;
                    name: string;
                    owner_id: string;
                    slug: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    industry_type?: string | null;
                    name: string;
                    owner_id: string;
                    slug: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    industry_type?: string | null;
                    name?: string;
                    owner_id?: string;
                    slug?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "organizations_owner_id_fkey";
                        columns: ["owner_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            profiles: {
                Row: {
                    avatar_url: string | null;
                    created_at: string | null;
                    email: string;
                    full_name: string | null;
                    id: string;
                    onboarding_completed: boolean | null;
                    user_feedback: boolean | null;
                    updated_at: string | null;
                };
                Insert: {
                    avatar_url?: string | null;
                    created_at?: string | null;
                    email: string;
                    full_name?: string | null;
                    id: string;
                    onboarding_completed?: boolean | null;
                    user_feedback?: boolean | null;
                    updated_at?: string | null;
                };
                Update: {
                    avatar_url?: string | null;
                    created_at?: string | null;
                    email?: string;
                    full_name?: string | null;
                    id?: string;
                    onboarding_completed?: boolean | null;
                    user_feedback?: boolean | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            schedules: {
                Row: {
                    created_at: string | null;
                    id: string;
                    is_published: boolean | null;
                    month: number;
                    organization_id: string;
                    published_at: string | null;
                    updated_at: string | null;
                    year: number;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    is_published?: boolean | null;
                    month: number;
                    organization_id: string;
                    published_at?: string | null;
                    updated_at?: string | null;
                    year: number;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    is_published?: boolean | null;
                    month?: number;
                    organization_id?: string;
                    published_at?: string | null;
                    updated_at?: string | null;
                    year?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "schedules_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            scheduling_rules: {
                Row: {
                    allow_overtime: boolean | null;
                    allow_split_shifts: boolean | null;
                    created_at: string | null;
                    enable_genetic_optimizer: boolean | null;
                    enable_ilp_optimizer: boolean | null;
                    generator_mode: string | null;
                    holiday_mode: string | null;
                    id: string;
                    industry_preset: string | null;
                    max_consecutive_days: number | null;
                    max_daily_work_hours: number | null;
                    max_overtime_monthly_hours: number | null;
                    max_weekends_per_month: number | null;
                    max_weekly_work_hours: number | null;
                    min_daily_rest_hours: number | null;
                    min_weekly_rest_hours: number | null;
                    optimization_weights: Json | null;
                    organization_id: string;
                    require_full_weekend: boolean | null;
                    role_based_minimums: Json | null;
                    shift_system: string | null;
                    split_shift_min_break_hours: number | null;
                    time_based_staffing: Json | null;
                    updated_at: string | null;
                    weekend_mode: string | null;
                };
                Insert: {
                    allow_overtime?: boolean | null;
                    allow_split_shifts?: boolean | null;
                    created_at?: string | null;
                    enable_genetic_optimizer?: boolean | null;
                    enable_ilp_optimizer?: boolean | null;
                    generator_mode?: string | null;
                    holiday_mode?: string | null;
                    id?: string;
                    industry_preset?: string | null;
                    max_consecutive_days?: number | null;
                    max_daily_work_hours?: number | null;
                    max_overtime_monthly_hours?: number | null;
                    max_weekends_per_month?: number | null;
                    max_weekly_work_hours?: number | null;
                    min_daily_rest_hours?: number | null;
                    min_weekly_rest_hours?: number | null;
                    optimization_weights?: Json | null;
                    organization_id: string;
                    require_full_weekend?: boolean | null;
                    role_based_minimums?: Json | null;
                    shift_system?: string | null;
                    split_shift_min_break_hours?: number | null;
                    time_based_staffing?: Json | null;
                    updated_at?: string | null;
                    weekend_mode?: string | null;
                };
                Update: {
                    allow_overtime?: boolean | null;
                    allow_split_shifts?: boolean | null;
                    created_at?: string | null;
                    enable_genetic_optimizer?: boolean | null;
                    enable_ilp_optimizer?: boolean | null;
                    generator_mode?: string | null;
                    holiday_mode?: string | null;
                    id?: string;
                    industry_preset?: string | null;
                    max_consecutive_days?: number | null;
                    max_daily_work_hours?: number | null;
                    max_overtime_monthly_hours?: number | null;
                    max_weekends_per_month?: number | null;
                    max_weekly_work_hours?: number | null;
                    min_daily_rest_hours?: number | null;
                    min_weekly_rest_hours?: number | null;
                    optimization_weights?: Json | null;
                    organization_id?: string;
                    require_full_weekend?: boolean | null;
                    role_based_minimums?: Json | null;
                    shift_system?: string | null;
                    split_shift_min_break_hours?: number | null;
                    time_based_staffing?: Json | null;
                    updated_at?: string | null;
                    weekend_mode?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "scheduling_rules_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: true;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            shift_template_assignments: {
                Row: {
                    created_at: string | null;
                    employee_id: string;
                    id: string;
                    template_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    employee_id: string;
                    id?: string;
                    template_id: string;
                };
                Update: {
                    created_at?: string | null;
                    employee_id?: string;
                    id?: string;
                    template_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "shift_template_assignments_employee_id_fkey";
                        columns: ["employee_id"];
                        isOneToOne: false;
                        referencedRelation: "employees";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "shift_template_assignments_template_id_fkey";
                        columns: ["template_id"];
                        isOneToOne: false;
                        referencedRelation: "shift_templates";
                        referencedColumns: ["id"];
                    }
                ];
            };
            shift_templates: {
                Row: {
                    applicable_days:
                        | Database["public"]["Enums"]["day_of_week"][]
                        | null;
                    break_minutes: number | null;
                    color: string | null;
                    created_at: string | null;
                    end_time: string;
                    id: string;
                    max_employees: number | null;
                    min_employees: number;
                    name: string;
                    organization_id: string;
                    start_time: string;
                    updated_at: string | null;
                };
                Insert: {
                    applicable_days?:
                        | Database["public"]["Enums"]["day_of_week"][]
                        | null;
                    break_minutes?: number | null;
                    color?: string | null;
                    created_at?: string | null;
                    end_time: string;
                    id?: string;
                    max_employees?: number | null;
                    min_employees?: number;
                    name: string;
                    organization_id: string;
                    start_time: string;
                    updated_at?: string | null;
                };
                Update: {
                    applicable_days?:
                        | Database["public"]["Enums"]["day_of_week"][]
                        | null;
                    break_minutes?: number | null;
                    color?: string | null;
                    created_at?: string | null;
                    end_time?: string;
                    id?: string;
                    max_employees?: number | null;
                    min_employees?: number;
                    name?: string;
                    organization_id?: string;
                    start_time?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "shift_templates_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            shifts: {
                Row: {
                    break_minutes: number | null;
                    color: string | null;
                    created_at: string | null;
                    date: string;
                    employee_id: string;
                    end_time: string;
                    id: string;
                    notes: string | null;
                    schedule_id: string;
                    start_time: string;
                    updated_at: string | null;
                };
                Insert: {
                    break_minutes?: number | null;
                    color?: string | null;
                    created_at?: string | null;
                    date: string;
                    employee_id: string;
                    end_time: string;
                    id?: string;
                    notes?: string | null;
                    schedule_id: string;
                    start_time: string;
                    updated_at?: string | null;
                };
                Update: {
                    break_minutes?: number | null;
                    color?: string | null;
                    created_at?: string | null;
                    date?: string;
                    employee_id?: string;
                    end_time?: string;
                    id?: string;
                    notes?: string | null;
                    schedule_id?: string;
                    start_time?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "shifts_employee_id_fkey";
                        columns: ["employee_id"];
                        isOneToOne: false;
                        referencedRelation: "employees";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "shifts_schedule_id_fkey";
                        columns: ["schedule_id"];
                        isOneToOne: false;
                        referencedRelation: "schedules";
                        referencedColumns: ["id"];
                    }
                ];
            };
            verification_codes: {
                Row: {
                    code: string;
                    created_at: string | null;
                    email: string;
                    expires_at: string;
                    id: string;
                };
                Insert: {
                    code: string;
                    created_at?: string | null;
                    email: string;
                    expires_at: string;
                    id?: string;
                };
                Update: {
                    code?: string;
                    created_at?: string | null;
                    email?: string;
                    expires_at?: string;
                    id?: string;
                };
                Relationships: [];
            };
            ai_generation_usage: {
                Row: {
                    id: string;
                    profile_id: string;
                    organization_id: string;
                    year: number;
                    month: number;
                    generation_count: number;
                    last_generated_at: string | null;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    profile_id: string;
                    organization_id: string;
                    year: number;
                    month: number;
                    generation_count?: number;
                    last_generated_at?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    profile_id?: string;
                    organization_id?: string;
                    year?: number;
                    month?: number;
                    generation_count?: number;
                    last_generated_at?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "ai_generation_usage_profile_id_fkey";
                        columns: ["profile_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "ai_generation_usage_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            trading_sundays: {
                Row: {
                    id: string;
                    date: string;
                    year: number;
                    month: number;
                    day: number;
                    description: string | null;
                    is_active: boolean;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    date: string;
                    year?: number;
                    month?: number;
                    day?: number;
                    description?: string | null;
                    is_active?: boolean;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    date?: string;
                    year?: number;
                    month?: number;
                    day?: number;
                    description?: string | null;
                    is_active?: boolean;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            newsletter_subscribers: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    subscribed_at: string | null;
                    is_active: boolean;
                    unsubscribed_at: string | null;
                    source: string | null;
                    notes: string | null;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    email: string;
                    full_name?: string | null;
                    subscribed_at?: string | null;
                    is_active?: boolean;
                    unsubscribed_at?: string | null;
                    source?: string | null;
                    notes?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    subscribed_at?: string | null;
                    is_active?: boolean;
                    unsubscribed_at?: string | null;
                    source?: string | null;
                    notes?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            newsletter_campaigns: {
                Row: {
                    id: string;
                    title: string;
                    subject: string;
                    content: string;
                    sent_by: string | null;
                    sent_at: string | null;
                    scheduled_at: string | null;
                    status: string;
                    recipients_count: number;
                    opened_count: number;
                    clicked_count: number;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    subject: string;
                    content: string;
                    sent_by?: string | null;
                    sent_at?: string | null;
                    scheduled_at?: string | null;
                    status?: string;
                    recipients_count?: number;
                    opened_count?: number;
                    clicked_count?: number;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    subject?: string;
                    content?: string;
                    sent_by?: string | null;
                    sent_at?: string | null;
                    scheduled_at?: string | null;
                    status?: string;
                    recipients_count?: number;
                    opened_count?: number;
                    clicked_count?: number;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "newsletter_campaigns_sent_by_fkey";
                        columns: ["sent_by"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            can_employee_have_shift: {
                Args: { p_employee_id: string; p_template_id: string };
                Returns: boolean;
            };
            check_employee_absence: {
                Args: { p_date: string; p_employee_id: string };
                Returns: {
                    absence_type: Database["public"]["Enums"]["absence_type"];
                    has_absence: boolean;
                    is_paid: boolean;
                    notes: string;
                }[];
            };
            cleanup_expired_verification_codes: {
                Args: never;
                Returns: undefined;
            };
            is_org_member: {
                Args: { org_id: string; uid: string };
                Returns: boolean;
            };
            is_org_owner: {
                Args: { org_id: string; uid: string };
                Returns: boolean;
            };
            is_organization_admin: {
                Args: { org_id: string };
                Returns: boolean;
            };
            is_organization_member: {
                Args: { org_id: string };
                Returns: boolean;
            };
            is_schedule_member: {
                Args: { sched_id: string; uid: string };
                Returns: boolean;
            };
            is_team_member: { Args: { team_uuid: string }; Returns: boolean };
        };
        Enums: {
            absence_status: "pending" | "approved" | "rejected";
            absence_type:
                | "vacation"
                | "sick_leave"
                | "uz"
                | "maternity"
                | "paternity"
                | "unpaid"
                | "childcare"
                | "bereavement"
                | "training"
                | "remote"
                | "blood_donation"
                | "court_summons"
                | "other";
            contract_type: "full_time" | "part_time" | "contract" | "intern";
            day_of_week:
                | "monday"
                | "tuesday"
                | "wednesday"
                | "thursday"
                | "friday"
                | "saturday"
                | "sunday";
            employee_role: "manager" | "employee";
            employment_type:
                | "full"
                | "half"
                | "custom"
                | "three_quarter"
                | "one_third";
            notification_type:
                | "shift_assigned"
                | "shift_changed"
                | "absence_request"
                | "absence_approved"
                | "absence_rejected"
                | "schedule_published";
            organization_role: "owner" | "admin" | "manager" | "viewer";
            organization_tier: "free" | "pro" | "enterprise";
            shift_type: "regular" | "overtime" | "training" | "on_call";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    "public"
>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
          DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
          DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never
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
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never
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
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never
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
        : never = never
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
    public: {
        Enums: {
            absence_status: ["pending", "approved", "rejected"],
            absence_type: [
                "vacation",
                "sick_leave",
                "uz",
                "maternity",
                "paternity",
                "unpaid",
                "childcare",
                "bereavement",
                "training",
                "remote",
                "blood_donation",
                "court_summons",
                "other",
            ],
            contract_type: ["full_time", "part_time", "contract", "intern"],
            day_of_week: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ],
            employee_role: ["manager", "employee"],
            employment_type: [
                "full",
                "half",
                "custom",
                "three_quarter",
                "one_third",
            ],
            notification_type: [
                "shift_assigned",
                "shift_changed",
                "absence_request",
                "absence_approved",
                "absence_rejected",
                "schedule_published",
            ],
            organization_role: ["owner", "admin", "manager", "viewer"],
            organization_tier: ["free", "pro", "enterprise"],
            shift_type: ["regular", "overtime", "training", "on_call"],
        },
    },
} as const;
