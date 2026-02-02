


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."absence_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."absence_status" OWNER TO "postgres";


CREATE TYPE "public"."absence_type" AS ENUM (
    'vacation',
    'sick_leave',
    'uz',
    'maternity',
    'paternity',
    'unpaid',
    'childcare',
    'bereavement',
    'training',
    'remote',
    'blood_donation',
    'court_summons',
    'other'
);


ALTER TYPE "public"."absence_type" OWNER TO "postgres";


CREATE TYPE "public"."contract_type" AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'intern'
);


ALTER TYPE "public"."contract_type" OWNER TO "postgres";


CREATE TYPE "public"."day_of_week" AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


ALTER TYPE "public"."day_of_week" OWNER TO "postgres";


CREATE TYPE "public"."employee_role" AS ENUM (
    'manager',
    'employee'
);


ALTER TYPE "public"."employee_role" OWNER TO "postgres";


CREATE TYPE "public"."employment_type" AS ENUM (
    'full',
    'half',
    'custom',
    'three_quarter',
    'one_third'
);


ALTER TYPE "public"."employment_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'shift_assigned',
    'shift_changed',
    'absence_request',
    'absence_approved',
    'absence_rejected',
    'schedule_published'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."organization_role" AS ENUM (
    'owner',
    'admin',
    'manager',
    'viewer'
);


ALTER TYPE "public"."organization_role" OWNER TO "postgres";


CREATE TYPE "public"."organization_tier" AS ENUM (
    'free',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."organization_tier" OWNER TO "postgres";


CREATE TYPE "public"."shift_type" AS ENUM (
    'regular',
    'overtime',
    'training',
    'on_call'
);


ALTER TYPE "public"."shift_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_employee_have_shift"("p_employee_id" "uuid", "p_template_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_has_assignments BOOLEAN;
    v_is_assigned BOOLEAN;
BEGIN
    -- Sprawdź czy szablon ma jakiekolwiek przypisania
    SELECT EXISTS(
        SELECT 1 FROM shift_template_assignments 
        WHERE template_id = p_template_id
    ) INTO v_has_assignments;
    
    -- Jeśli nie ma przypisań, każdy może mieć tę zmianę
    IF NOT v_has_assignments THEN
        RETURN true;
    END IF;
    
    -- Sprawdź czy pracownik jest przypisany
    SELECT EXISTS(
        SELECT 1 FROM shift_template_assignments 
        WHERE template_id = p_template_id AND employee_id = p_employee_id
    ) INTO v_is_assigned;
    
    RETURN v_is_assigned;
END;
$$;


ALTER FUNCTION "public"."can_employee_have_shift"("p_employee_id" "uuid", "p_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_employee_absence"("p_employee_id" "uuid", "p_date" "date") RETURNS TABLE("has_absence" boolean, "absence_type" "public"."absence_type", "is_paid" boolean, "notes" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true AS has_absence,
        ea.absence_type,
        ea.is_paid,
        ea.notes
    FROM employee_absences ea
    WHERE ea.employee_id = p_employee_id
      AND p_date BETWEEN ea.start_date AND ea.end_date
    LIMIT 1;
    
    -- Jeśli nie znaleziono nieobecności
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::absence_type, NULL::boolean, NULL::text;
    END IF;
END;
$$;


ALTER FUNCTION "public"."check_employee_absence"("p_employee_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_verification_codes"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_verification_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("org_id" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = uid
  );
END;
$$;


ALTER FUNCTION "public"."is_org_member"("org_id" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_owner"("org_id" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = uid
  );
END;
$$;


ALTER FUNCTION "public"."is_org_owner"("org_id" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_admin"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$;


ALTER FUNCTION "public"."is_organization_admin"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_member"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."is_organization_member"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_schedule_member"("sched_id" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id FROM schedules WHERE id = sched_id;
  RETURN is_org_member(org_id, uid);
END;
$$;


ALTER FUNCTION "public"."is_schedule_member"("sched_id" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_member"("team_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams WHERE id = team_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM employees WHERE team_id = team_uuid AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_team_member"("team_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_trading_sunday_date_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.year = EXTRACT(YEAR FROM NEW.date);
    NEW.month = EXTRACT(MONTH FROM NEW.date);
    NEW.day = EXTRACT(DAY FROM NEW.date);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_trading_sunday_date_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_generation_usage_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_generation_usage_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_newsletter_campaigns_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_newsletter_campaigns_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_newsletter_subscribers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_newsletter_subscribers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scheduling_rules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_scheduling_rules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trading_sundays_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_trading_sundays_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_generation_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "generation_count" integer DEFAULT 0 NOT NULL,
    "last_generated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_generation_usage_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."ai_generation_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_generation_usage" IS 'Śledzenie użycia generowania grafików AI - limit 3x/miesiąc';



COMMENT ON COLUMN "public"."ai_generation_usage"."generation_count" IS 'Liczba wygenerowanych grafików w danym miesiącu';



COMMENT ON COLUMN "public"."ai_generation_usage"."last_generated_at" IS 'Data ostatniego wygenerowania grafiku';



CREATE TABLE IF NOT EXISTS "public"."employee_absences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "absence_type" "public"."absence_type" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_paid" boolean DEFAULT true,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."employee_absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "preferred_days" integer[] DEFAULT ARRAY[]::integer[],
    "unavailable_days" integer[] DEFAULT ARRAY[]::integer[],
    "preferred_start_time" time without time zone,
    "preferred_end_time" time without time zone,
    "max_hours_per_day" integer,
    "max_hours_per_week" integer,
    "can_work_weekends" boolean DEFAULT true,
    "can_work_holidays" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_preferences" IS 'Stores employee work preferences like preferred days, hours, and availability';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "position" "text",
    "employment_type" "public"."employment_type" DEFAULT 'full'::"public"."employment_type",
    "custom_hours" numeric(4,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "color" "text" DEFAULT '#3b82f6'::"text"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."employment_type" IS 'Employment type: full (8h), three_quarter (6h), half (4h), one_third (2.67h), custom';



CREATE TABLE IF NOT EXISTS "public"."holidays_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "country_code" "text" DEFAULT 'PL'::"text" NOT NULL,
    "holidays" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."holidays_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "subject" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "sent_by" "uuid",
    "sent_at" timestamp with time zone,
    "scheduled_at" timestamp with time zone,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "recipients_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "clicked_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."newsletter_campaigns" OWNER TO "postgres";


COMMENT ON TABLE "public"."newsletter_campaigns" IS 'Kampanie newsletterowe';



COMMENT ON COLUMN "public"."newsletter_campaigns"."status" IS 'Status kampanii: draft, scheduled, sending, sent, failed';



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "full_name" character varying(255),
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "unsubscribed_at" timestamp with time zone,
    "source" character varying(50) DEFAULT 'website'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


COMMENT ON TABLE "public"."newsletter_subscribers" IS 'Subskrybenci newslettera';



COMMENT ON COLUMN "public"."newsletter_subscribers"."is_active" IS 'Czy subskrypcja jest aktywna';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "trading_sundays_mode" "text" DEFAULT 'none'::"text" NOT NULL,
    "custom_trading_sundays" "text"[],
    "default_shift_duration" integer DEFAULT 8 NOT NULL,
    "default_break_minutes" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store_open_time" time without time zone DEFAULT '06:00:00'::time without time zone,
    "store_close_time" time without time zone DEFAULT '22:00:00'::time without time zone,
    "min_employees_per_shift" integer DEFAULT 1,
    "enable_trading_sundays" boolean DEFAULT true,
    "opening_hours" "jsonb" DEFAULT '{"friday": {"open": "09:00", "close": "21:00", "enabled": true}, "monday": {"open": "09:00", "close": "21:00", "enabled": true}, "sunday": {"open": "10:00", "close": "18:00", "enabled": false}, "tuesday": {"open": "09:00", "close": "21:00", "enabled": true}, "saturday": {"open": "09:00", "close": "21:00", "enabled": true}, "thursday": {"open": "09:00", "close": "21:00", "enabled": true}, "wednesday": {"open": "09:00", "close": "21:00", "enabled": true}}'::"jsonb",
    CONSTRAINT "organization_settings_trading_sundays_mode_check" CHECK (("trading_sundays_mode" = ANY (ARRAY['all'::"text", 'none'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."organization_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_settings" IS 'Stores organization-specific settings like trading Sundays, default shift duration, etc.';



COMMENT ON COLUMN "public"."organization_settings"."store_open_time" IS 'Store/salon opening time';



COMMENT ON COLUMN "public"."organization_settings"."store_close_time" IS 'Store/salon closing time';



COMMENT ON COLUMN "public"."organization_settings"."min_employees_per_shift" IS 'Minimum number of employees per shift';



COMMENT ON COLUMN "public"."organization_settings"."enable_trading_sundays" IS 'Whether to enable trading Sundays feature';



COMMENT ON COLUMN "public"."organization_settings"."opening_hours" IS 'Godziny otwarcia dla każdego dnia tygodnia';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "industry_type" "text" DEFAULT 'general'::"text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."industry_type" IS 'Typ branży organizacji';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed" boolean DEFAULT false,
    "user_feedback" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schedules_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduling_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "industry_preset" "text" DEFAULT 'general'::"text",
    "min_daily_rest_hours" integer DEFAULT 11,
    "min_weekly_rest_hours" integer DEFAULT 35,
    "max_daily_work_hours" integer DEFAULT 8,
    "max_weekly_work_hours" integer DEFAULT 40,
    "max_consecutive_days" integer DEFAULT 5,
    "allow_overtime" boolean DEFAULT true,
    "max_overtime_monthly_hours" integer DEFAULT 20,
    "shift_system" "text" DEFAULT 'standard'::"text",
    "allow_split_shifts" boolean DEFAULT false,
    "split_shift_min_break_hours" integer DEFAULT 2,
    "time_based_staffing" "jsonb" DEFAULT '[]'::"jsonb",
    "role_based_minimums" "jsonb" DEFAULT '{}'::"jsonb",
    "weekend_mode" "text" DEFAULT 'rotate'::"text",
    "max_weekends_per_month" integer DEFAULT 2,
    "require_full_weekend" boolean DEFAULT false,
    "holiday_mode" "text" DEFAULT 'rotate'::"text",
    "optimization_weights" "jsonb" DEFAULT '{"hoursBalance": 10, "restViolation": 1000, "weekendBalance": 50, "emptyDayPenalty": 500, "shiftTypeChange": 15, "preferenceViolation": 30, "understaffedPenalty": 300, "consecutiveDaysViolation": 800}'::"jsonb",
    "generator_mode" "text" DEFAULT 'balanced'::"text",
    "enable_ilp_optimizer" boolean DEFAULT true,
    "enable_genetic_optimizer" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduling_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."scheduling_rules" IS 'Konfigurowalne reguły harmonogramowania per organizacja';



COMMENT ON COLUMN "public"."scheduling_rules"."industry_preset" IS 'Preset branżowy: general, retail, gastronomy, production, healthcare, call_center, security, education, beauty';



COMMENT ON COLUMN "public"."scheduling_rules"."shift_system" IS 'System zmianowy: standard, two_shift, three_shift, four_brigade, 12h_rotation';



COMMENT ON COLUMN "public"."scheduling_rules"."weekend_mode" IS 'Tryb weekendowy: all_work, rotate, volunteer, closed';



COMMENT ON COLUMN "public"."scheduling_rules"."holiday_mode" IS 'Tryb świąteczny: closed, rotate, volunteer, premium_pay';



COMMENT ON COLUMN "public"."scheduling_rules"."generator_mode" IS 'Tryb generatora: fast (~8s), balanced (~15s), thorough (~30s)';



CREATE TABLE IF NOT EXISTS "public"."shift_template_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shift_template_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 0,
    "color" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "min_employees" integer DEFAULT 1 NOT NULL,
    "applicable_days" "public"."day_of_week"[],
    "max_employees" integer
);


ALTER TABLE "public"."shift_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shift_templates"."min_employees" IS 'Minimum number of employees required for this shift';



COMMENT ON COLUMN "public"."shift_templates"."applicable_days" IS 'Dni tygodnia w które szablon może być używany. NULL = wszystkie dni, array = tylko wybrane dni. Przykład: {saturday, sunday} = tylko weekendy';



COMMENT ON COLUMN "public"."shift_templates"."max_employees" IS 'Maksymalna liczba pracowników na zmianę. Jeśli równe min_employees, wymusza dokładną liczbę.';



CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "color" "text"
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trading_sundays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "day" integer NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_sunday" CHECK ((EXTRACT(dow FROM "date") = (0)::numeric)),
    CONSTRAINT "trading_sundays_day_check" CHECK ((("day" >= 1) AND ("day" <= 31))),
    CONSTRAINT "trading_sundays_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."trading_sundays" OWNER TO "postgres";


COMMENT ON TABLE "public"."trading_sundays" IS 'Lista niedziel handlowych w Polsce - sklepy mogą być otwarte';



COMMENT ON COLUMN "public"."trading_sundays"."description" IS 'Opcjonalny opis niedzieli handlowej (np. powód)';



COMMENT ON COLUMN "public"."trading_sundays"."is_active" IS 'Czy niedziela handlowa jest aktywna (można ją wyłączyć bez usuwania)';



CREATE TABLE IF NOT EXISTS "public"."verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'email_verification'::"text" NOT NULL
);


ALTER TABLE "public"."verification_codes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."verification_codes"."type" IS 'Type of verification code: email_verification or password_reset';



ALTER TABLE ONLY "public"."ai_generation_usage"
    ADD CONSTRAINT "ai_generation_usage_organization_id_year_month_key" UNIQUE ("organization_id", "year", "month");



ALTER TABLE ONLY "public"."ai_generation_usage"
    ADD CONSTRAINT "ai_generation_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_preferences"
    ADD CONSTRAINT "employee_preferences_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."employee_preferences"
    ADD CONSTRAINT "employee_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays_cache"
    ADD CONSTRAINT "holidays_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays_cache"
    ADD CONSTRAINT "holidays_cache_year_country_code_key" UNIQUE ("year", "country_code");



ALTER TABLE ONLY "public"."newsletter_campaigns"
    ADD CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_organization_id_year_month_key" UNIQUE ("organization_id", "year", "month");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_template_assignments"
    ADD CONSTRAINT "shift_template_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_template_assignments"
    ADD CONSTRAINT "shift_template_assignments_template_id_employee_id_key" UNIQUE ("template_id", "employee_id");



ALTER TABLE ONLY "public"."shift_templates"
    ADD CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_schedule_id_employee_id_date_times_key" UNIQUE ("schedule_id", "employee_id", "date", "start_time", "end_time");



ALTER TABLE ONLY "public"."trading_sundays"
    ADD CONSTRAINT "trading_sundays_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."trading_sundays"
    ADD CONSTRAINT "trading_sundays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_codes"
    ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_absences_employee_dates" ON "public"."employee_absences" USING "btree" ("employee_id", "start_date", "end_date");



CREATE INDEX "idx_ai_generation_usage_org_date" ON "public"."ai_generation_usage" USING "btree" ("organization_id", "year", "month");



CREATE INDEX "idx_ai_generation_usage_profile" ON "public"."ai_generation_usage" USING "btree" ("profile_id");



CREATE INDEX "idx_employee_absences_dates" ON "public"."employee_absences" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_employee_absences_employee" ON "public"."employee_absences" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_absences_org" ON "public"."employee_absences" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_absences_type" ON "public"."employee_absences" USING "btree" ("absence_type");



CREATE INDEX "idx_employee_preferences_employee_id" ON "public"."employee_preferences" USING "btree" ("employee_id");



CREATE INDEX "idx_employees_active" ON "public"."employees" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_employees_active_only" ON "public"."employees" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_employees_org_id" ON "public"."employees" USING "btree" ("organization_id");



CREATE INDEX "idx_holidays_cache_lookup" ON "public"."holidays_cache" USING "btree" ("year", "country_code");



CREATE INDEX "idx_newsletter_campaigns_sent_at" ON "public"."newsletter_campaigns" USING "btree" ("sent_at");



CREATE INDEX "idx_newsletter_campaigns_sent_by" ON "public"."newsletter_campaigns" USING "btree" ("sent_by");



CREATE INDEX "idx_newsletter_campaigns_status" ON "public"."newsletter_campaigns" USING "btree" ("status");



CREATE INDEX "idx_newsletter_subscribers_active" ON "public"."newsletter_subscribers" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_newsletter_subscribers_email" ON "public"."newsletter_subscribers" USING "btree" ("email");



CREATE INDEX "idx_newsletter_subscribers_subscribed" ON "public"."newsletter_subscribers" USING "btree" ("subscribed_at");



CREATE INDEX "idx_organization_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_settings_org_id" ON "public"."organization_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_schedules_org_year_month" ON "public"."schedules" USING "btree" ("organization_id", "year", "month");



CREATE INDEX "idx_scheduling_rules_org" ON "public"."scheduling_rules" USING "btree" ("organization_id");



CREATE INDEX "idx_shift_template_assignments_employee" ON "public"."shift_template_assignments" USING "btree" ("employee_id");



CREATE INDEX "idx_shift_template_assignments_template" ON "public"."shift_template_assignments" USING "btree" ("template_id");



CREATE INDEX "idx_shift_templates_org_id" ON "public"."shift_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_shifts_date" ON "public"."shifts" USING "btree" ("date");



CREATE INDEX "idx_shifts_employee_id" ON "public"."shifts" USING "btree" ("employee_id");



CREATE INDEX "idx_shifts_schedule_date" ON "public"."shifts" USING "btree" ("schedule_id", "date");



CREATE INDEX "idx_shifts_schedule_id" ON "public"."shifts" USING "btree" ("schedule_id");



CREATE INDEX "idx_template_assignments_composite" ON "public"."shift_template_assignments" USING "btree" ("template_id", "employee_id");



CREATE INDEX "idx_trading_sundays_active" ON "public"."trading_sundays" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_trading_sundays_date" ON "public"."trading_sundays" USING "btree" ("date");



CREATE INDEX "idx_trading_sundays_year_month" ON "public"."trading_sundays" USING "btree" ("year", "month");



CREATE INDEX "idx_verification_codes_email" ON "public"."verification_codes" USING "btree" ("email");



CREATE INDEX "idx_verification_codes_expires" ON "public"."verification_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_verification_codes_expires_at" ON "public"."verification_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_verification_codes_type_email" ON "public"."verification_codes" USING "btree" ("type", "email");



CREATE OR REPLACE TRIGGER "ai_generation_usage_updated_at" BEFORE UPDATE ON "public"."ai_generation_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_generation_usage_updated_at"();



CREATE OR REPLACE TRIGGER "newsletter_campaigns_updated_at" BEFORE UPDATE ON "public"."newsletter_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_newsletter_campaigns_updated_at"();



CREATE OR REPLACE TRIGGER "newsletter_subscribers_updated_at" BEFORE UPDATE ON "public"."newsletter_subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."update_newsletter_subscribers_updated_at"();



CREATE OR REPLACE TRIGGER "trading_sundays_set_date_fields" BEFORE INSERT OR UPDATE ON "public"."trading_sundays" FOR EACH ROW EXECUTE FUNCTION "public"."set_trading_sunday_date_fields"();



CREATE OR REPLACE TRIGGER "trading_sundays_updated_at" BEFORE UPDATE ON "public"."trading_sundays" FOR EACH ROW EXECUTE FUNCTION "public"."update_trading_sundays_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_scheduling_rules_updated_at" BEFORE UPDATE ON "public"."scheduling_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_scheduling_rules_updated_at"();



CREATE OR REPLACE TRIGGER "update_employee_absences_updated_at" BEFORE UPDATE ON "public"."employee_absences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedules_updated_at" BEFORE UPDATE ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shift_templates_updated_at" BEFORE UPDATE ON "public"."shift_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_generation_usage"
    ADD CONSTRAINT "ai_generation_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generation_usage"
    ADD CONSTRAINT "ai_generation_usage_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_preferences"
    ADD CONSTRAINT "employee_preferences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."newsletter_campaigns"
    ADD CONSTRAINT "newsletter_campaigns_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_template_assignments"
    ADD CONSTRAINT "shift_template_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_template_assignments"
    ADD CONSTRAINT "shift_template_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."shift_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_templates"
    ADD CONSTRAINT "shift_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can read holidays" ON "public"."holidays_cache" FOR SELECT USING (true);



CREATE POLICY "Anyone can view trading sundays" ON "public"."trading_sundays" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete campaigns" ON "public"."newsletter_campaigns" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can delete subscribers" ON "public"."newsletter_subscribers" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can delete trading sundays" ON "public"."trading_sundays" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert campaigns" ON "public"."newsletter_campaigns" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert subscribers" ON "public"."newsletter_subscribers" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert trading sundays" ON "public"."trading_sundays" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update campaigns" ON "public"."newsletter_campaigns" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update subscribers" ON "public"."newsletter_subscribers" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update trading sundays" ON "public"."trading_sundays" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view campaigns" ON "public"."newsletter_campaigns" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view subscribers" ON "public"."newsletter_subscribers" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Members can create absences" ON "public"."employee_absences" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can create employees" ON "public"."employees" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can create schedules" ON "public"."schedules" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can create shift templates" ON "public"."shift_templates" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can create shifts" ON "public"."shifts" FOR INSERT WITH CHECK ("public"."is_schedule_member"("schedule_id", "auth"."uid"()));



CREATE POLICY "Members can create template assignments" ON "public"."shift_template_assignments" FOR INSERT WITH CHECK (("template_id" IN ( SELECT "st"."id"
   FROM ("public"."shift_templates" "st"
     JOIN "public"."organization_members" "om" ON (("st"."organization_id" = "om"."organization_id")))
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can delete absences" ON "public"."employee_absences" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can delete employees" ON "public"."employees" FOR DELETE USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can delete shift templates" ON "public"."shift_templates" FOR DELETE USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can delete shifts" ON "public"."shifts" FOR DELETE USING ("public"."is_schedule_member"("schedule_id", "auth"."uid"()));



CREATE POLICY "Members can delete template assignments" ON "public"."shift_template_assignments" FOR DELETE USING (("template_id" IN ( SELECT "st"."id"
   FROM ("public"."shift_templates" "st"
     JOIN "public"."organization_members" "om" ON (("st"."organization_id" = "om"."organization_id")))
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update absences" ON "public"."employee_absences" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update employees" ON "public"."employees" FOR UPDATE USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can update schedules" ON "public"."schedules" FOR UPDATE USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can update shift templates" ON "public"."shift_templates" FOR UPDATE USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can update shifts" ON "public"."shifts" FOR UPDATE USING ("public"."is_schedule_member"("schedule_id", "auth"."uid"()));



CREATE POLICY "Members can view absences" ON "public"."employee_absences" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view employees" ON "public"."employees" FOR SELECT USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can view organization members" ON "public"."organization_members" FOR SELECT USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can view schedules" ON "public"."schedules" FOR SELECT USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can view shift templates" ON "public"."shift_templates" FOR SELECT USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "Members can view shifts" ON "public"."shifts" FOR SELECT USING ("public"."is_schedule_member"("schedule_id", "auth"."uid"()));



CREATE POLICY "Members can view template assignments" ON "public"."shift_template_assignments" FOR SELECT USING (("template_id" IN ( SELECT "st"."id"
   FROM ("public"."shift_templates" "st"
     JOIN "public"."organization_members" "om" ON (("st"."organization_id" = "om"."organization_id")))
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view their organizations" ON "public"."organizations" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR "public"."is_org_member"("id", "auth"."uid"())));



CREATE POLICY "No direct access to verification codes" ON "public"."verification_codes" USING (false);



CREATE POLICY "Owners can add members" ON "public"."organization_members" FOR INSERT WITH CHECK ("public"."is_org_owner"("organization_id", "auth"."uid"()));



CREATE POLICY "Owners can delete their organizations" ON "public"."organizations" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners can remove members" ON "public"."organization_members" FOR DELETE USING ("public"."is_org_owner"("organization_id", "auth"."uid"()));



CREATE POLICY "Owners can update their organizations" ON "public"."organizations" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can create organizations" ON "public"."organizations" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can create scheduling rules for their organization" ON "public"."scheduling_rules" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "scheduling_rules"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their organization scheduling rules" ON "public"."scheduling_rules" FOR DELETE USING (("organization_id" IN ( SELECT "scheduling_rules"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert AI generation usage" ON "public"."ai_generation_usage" FOR INSERT WITH CHECK ((("profile_id" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update AI generation usage" ON "public"."ai_generation_usage" FOR UPDATE USING ((("profile_id" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"()))))) WITH CHECK ((("profile_id" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their organization scheduling rules" ON "public"."scheduling_rules" FOR UPDATE USING (("organization_id" IN ( SELECT "scheduling_rules"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their AI generation usage" ON "public"."ai_generation_usage" FOR SELECT USING ((("profile_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their organization scheduling rules" ON "public"."scheduling_rules" FOR SELECT USING (("organization_id" IN ( SELECT "scheduling_rules"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."ai_generation_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_absences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_preferences_delete_policy" ON "public"."employee_preferences" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "employee_preferences"."employee_id") AND "public"."is_org_member"("e"."organization_id", "auth"."uid"())))));



CREATE POLICY "employee_preferences_insert_policy" ON "public"."employee_preferences" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "employee_preferences"."employee_id") AND "public"."is_org_member"("e"."organization_id", "auth"."uid"())))));



CREATE POLICY "employee_preferences_select_policy" ON "public"."employee_preferences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "employee_preferences"."employee_id") AND "public"."is_org_member"("e"."organization_id", "auth"."uid"())))));



CREATE POLICY "employee_preferences_update_policy" ON "public"."employee_preferences" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "employee_preferences"."employee_id") AND "public"."is_org_member"("e"."organization_id", "auth"."uid"())))));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holidays_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_settings_delete_policy" ON "public"."organization_settings" FOR DELETE USING ("public"."is_org_owner"("organization_id", "auth"."uid"()));



CREATE POLICY "organization_settings_insert_policy" ON "public"."organization_settings" FOR INSERT WITH CHECK ("public"."is_org_owner"("organization_id", "auth"."uid"()));



CREATE POLICY "organization_settings_select_policy" ON "public"."organization_settings" FOR SELECT USING ("public"."is_org_member"("organization_id", "auth"."uid"()));



CREATE POLICY "organization_settings_update_policy" ON "public"."organization_settings" FOR UPDATE USING ("public"."is_org_owner"("organization_id", "auth"."uid"()));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduling_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_template_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trading_sundays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verification_codes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."can_employee_have_shift"("p_employee_id" "uuid", "p_template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_employee_have_shift"("p_employee_id" "uuid", "p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_employee_have_shift"("p_employee_id" "uuid", "p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_employee_absence"("p_employee_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."check_employee_absence"("p_employee_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_employee_absence"("p_employee_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_owner"("org_id" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_owner"("org_id" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_owner"("org_id" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_member"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_member"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_member"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_schedule_member"("sched_id" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_schedule_member"("sched_id" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_schedule_member"("sched_id" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("team_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_trading_sunday_date_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_trading_sunday_date_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_trading_sunday_date_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_generation_usage_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_generation_usage_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_generation_usage_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_newsletter_campaigns_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_newsletter_campaigns_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_newsletter_campaigns_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_newsletter_subscribers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_newsletter_subscribers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_newsletter_subscribers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scheduling_rules_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_scheduling_rules_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scheduling_rules_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trading_sundays_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trading_sundays_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trading_sundays_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_generation_usage" TO "anon";
GRANT ALL ON TABLE "public"."ai_generation_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_generation_usage" TO "service_role";



GRANT ALL ON TABLE "public"."employee_absences" TO "anon";
GRANT ALL ON TABLE "public"."employee_absences" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_absences" TO "service_role";



GRANT ALL ON TABLE "public"."employee_preferences" TO "anon";
GRANT ALL ON TABLE "public"."employee_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."holidays_cache" TO "anon";
GRANT ALL ON TABLE "public"."holidays_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays_cache" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organization_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."scheduling_rules" TO "anon";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "service_role";



GRANT ALL ON TABLE "public"."shift_template_assignments" TO "anon";
GRANT ALL ON TABLE "public"."shift_template_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_template_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."shift_templates" TO "anon";
GRANT ALL ON TABLE "public"."shift_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_templates" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."trading_sundays" TO "anon";
GRANT ALL ON TABLE "public"."trading_sundays" TO "authenticated";
GRANT ALL ON TABLE "public"."trading_sundays" TO "service_role";



GRANT ALL ON TABLE "public"."verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_codes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































