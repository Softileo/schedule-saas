-- =============================================================================
-- FULL DATABASE SCHEMA EXPORT - Calenda Schedule SaaS
-- Generated: 2026-01-29
-- =============================================================================

-- Drop existing types and tables if they exist (for clean import)
DROP TABLE IF EXISTS newsletter_campaigns CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS trading_sundays CASCADE;
DROP TABLE IF EXISTS ai_generation_usage CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS shift_templates CASCADE;
DROP TABLE IF EXISTS shift_template_assignments CASCADE;
DROP TABLE IF EXISTS scheduling_rules CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS employee_preferences CASCADE;
DROP TABLE IF EXISTS employee_absences CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS holidays_cache CASCADE;

-- Drop enums
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS organization_tier CASCADE;
DROP TYPE IF EXISTS organization_role CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS employment_type CASCADE;
DROP TYPE IF EXISTS employee_role CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS contract_type CASCADE;
DROP TYPE IF EXISTS absence_type CASCADE;
DROP TYPE IF EXISTS absence_status CASCADE;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE absence_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE absence_type AS ENUM (
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

CREATE TYPE contract_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');

CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

CREATE TYPE employee_role AS ENUM ('manager', 'employee');

CREATE TYPE employment_type AS ENUM ('full', 'half', 'custom', 'three_quarter', 'one_third');

CREATE TYPE notification_type AS ENUM (
    'shift_assigned',
    'shift_changed',
    'absence_request',
    'absence_approved',
    'absence_rejected',
    'schedule_published'
);

CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'manager', 'viewer');

CREATE TYPE organization_tier AS ENUM ('free', 'pro', 'enterprise');

CREATE TYPE shift_type AS ENUM ('regular', 'overtime', 'training', 'on_call');

-- =============================================================================
-- TABLES
-- =============================================================================

-- profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    user_feedback BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    industry_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organization_members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- organization_settings table
CREATE TABLE organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    default_shift_duration INTEGER NOT NULL DEFAULT 8,
    default_break_minutes INTEGER NOT NULL DEFAULT 30,
    store_open_time TIME,
    store_close_time TIME,
    min_employees_per_shift INTEGER,
    enable_trading_sundays BOOLEAN DEFAULT false,
    trading_sundays_mode TEXT NOT NULL DEFAULT 'legal',
    custom_trading_sundays TEXT[],
    opening_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    employment_type employment_type,
    custom_hours NUMERIC(5,2),
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- employee_absences table
CREATE TABLE employee_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    absence_type absence_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- employee_preferences table
CREATE TABLE employee_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    preferred_start_time TIME,
    preferred_end_time TIME,
    max_hours_per_day NUMERIC(4,2),
    max_hours_per_week NUMERIC(5,2),
    can_work_weekends BOOLEAN DEFAULT true,
    can_work_holidays BOOLEAN DEFAULT true,
    preferred_days INTEGER[],
    unavailable_days INTEGER[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, year, month)
);

-- shift_templates table
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    min_employees INTEGER NOT NULL DEFAULT 1,
    max_employees INTEGER CHECK (max_employees IS NULL OR max_employees >= 1),
    color TEXT,
    applicable_days day_of_week[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN shift_templates.max_employees IS 'Maximum number of employees for this shift template. NULL means unlimited, must be >= 1 if set.';

-- shift_template_assignments table
CREATE TABLE shift_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, employee_id)
);

-- shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    color TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schedule_id, employee_id, date, start_time)
);

-- scheduling_rules table
CREATE TABLE scheduling_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    shift_system TEXT,
    weekend_mode TEXT,
    holiday_mode TEXT,
    generator_mode TEXT,
    industry_preset TEXT,
    max_daily_work_hours NUMERIC(4,2),
    max_weekly_work_hours NUMERIC(5,2),
    min_daily_rest_hours NUMERIC(4,2),
    min_weekly_rest_hours NUMERIC(5,2),
    max_consecutive_days INTEGER,
    max_weekends_per_month INTEGER,
    require_full_weekend BOOLEAN DEFAULT false,
    allow_overtime BOOLEAN DEFAULT false,
    max_overtime_monthly_hours NUMERIC(5,2),
    allow_split_shifts BOOLEAN DEFAULT false,
    split_shift_min_break_hours NUMERIC(4,2),
    enable_genetic_optimizer BOOLEAN DEFAULT false,
    enable_ilp_optimizer BOOLEAN DEFAULT false,
    optimization_weights JSONB,
    time_based_staffing JSONB,
    role_based_minimums JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- holidays_cache table
CREATE TABLE holidays_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'PL',
    holidays JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, country_code)
);

-- verification_codes table
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_generation_usage table
CREATE TABLE ai_generation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    generation_count INTEGER NOT NULL DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, organization_id, year, month)
);

-- trading_sundays table
CREATE TABLE trading_sundays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- newsletter_subscribers table
CREATE TABLE newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    source TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- newsletter_campaigns table
CREATE TABLE newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID REFERENCES profiles(id),
    sent_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    recipients_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Organizations indexes
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Employees indexes
CREATE INDEX idx_employees_organization_id ON employees(organization_id);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_organization_active ON employees(organization_id, is_active);

-- Shifts indexes
CREATE INDEX idx_shifts_schedule_id ON shifts(schedule_id);
CREATE INDEX idx_shifts_employee_id ON shifts(employee_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_schedule_date ON shifts(schedule_id, date);
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date);

-- Schedules indexes
CREATE INDEX idx_schedules_organization_id ON schedules(organization_id);
CREATE INDEX idx_schedules_year_month ON schedules(year, month);
CREATE INDEX idx_schedules_organization_year_month ON schedules(organization_id, year, month);

-- Employee absences indexes
CREATE INDEX idx_employee_absences_employee_id ON employee_absences(employee_id);
CREATE INDEX idx_employee_absences_organization_id ON employee_absences(organization_id);
CREATE INDEX idx_employee_absences_date_range ON employee_absences(start_date, end_date);
CREATE INDEX idx_employee_absences_employee_dates ON employee_absences(employee_id, start_date, end_date);

-- Shift templates indexes
CREATE INDEX idx_shift_templates_organization_id ON shift_templates(organization_id);

-- Shift template assignments indexes
CREATE INDEX idx_shift_template_assignments_template_id ON shift_template_assignments(template_id);
CREATE INDEX idx_shift_template_assignments_employee_id ON shift_template_assignments(employee_id);

-- AI generation usage indexes
CREATE INDEX idx_ai_generation_usage_profile_org ON ai_generation_usage(profile_id, organization_id);
CREATE INDEX idx_ai_generation_usage_year_month ON ai_generation_usage(year, month);

-- Trading sundays indexes
CREATE INDEX idx_trading_sundays_date ON trading_sundays(date);
CREATE INDEX idx_trading_sundays_year ON trading_sundays(year);
CREATE INDEX idx_trading_sundays_is_active ON trading_sundays(is_active);

-- Newsletter indexes
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_is_active ON newsletter_subscribers(is_active);
CREATE INDEX idx_newsletter_campaigns_status ON newsletter_campaigns(status);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: is_org_owner
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations
        WHERE id = org_id AND owner_id = uid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_org_member
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id AND user_id = uid
    ) OR is_org_owner(org_id, uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_organization_admin
CREATE OR REPLACE FUNCTION is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_org_owner(org_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_organization_member
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_org_member(org_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_schedule_member
CREATE OR REPLACE FUNCTION is_schedule_member(sched_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM schedules
    WHERE id = sched_id;
    
    RETURN is_org_member(org_id, uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_team_member
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_org_member(team_uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: check_employee_absence
CREATE OR REPLACE FUNCTION check_employee_absence(p_date DATE, p_employee_id UUID)
RETURNS TABLE (
    has_absence BOOLEAN,
    absence_type absence_type,
    is_paid BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_absence,
        ea.absence_type,
        ea.is_paid,
        ea.notes
    FROM employee_absences ea
    WHERE ea.employee_id = p_employee_id
      AND p_date BETWEEN ea.start_date AND ea.end_date
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::absence_type, NULL::BOOLEAN, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: can_employee_have_shift
CREATE OR REPLACE FUNCTION can_employee_have_shift(p_employee_id UUID, p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shift_template_assignments
        WHERE employee_id = p_employee_id
          AND template_id = p_template_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: cleanup_expired_verification_codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_codes
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sundays ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view organizations they are members of" ON organizations
    FOR SELECT USING (is_organization_member(id));

CREATE POLICY "Organization owners can update their organization" ON organizations
    FOR UPDATE USING (is_organization_admin(id));

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Members can view organization membership" ON organization_members
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Organization owners can manage members" ON organization_members
    FOR ALL USING (is_organization_admin(organization_id));

-- Employees policies
CREATE POLICY "Members can view organization employees" ON employees
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can manage organization employees" ON employees
    FOR ALL USING (is_organization_member(organization_id));

-- Employee absences policies
CREATE POLICY "Members can view organization employee absences" ON employee_absences
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can manage organization employee absences" ON employee_absences
    FOR ALL USING (is_organization_member(organization_id));

-- Schedules policies
CREATE POLICY "Members can view organization schedules" ON schedules
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can manage organization schedules" ON schedules
    FOR ALL USING (is_organization_member(organization_id));

-- Shifts policies
CREATE POLICY "Members can view shifts in their organization schedules" ON shifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM schedules
            WHERE schedules.id = shifts.schedule_id
            AND is_organization_member(schedules.organization_id)
        )
    );

CREATE POLICY "Members can manage shifts in their organization schedules" ON shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schedules
            WHERE schedules.id = shifts.schedule_id
            AND is_organization_member(schedules.organization_id)
        )
    );

-- Shift templates policies
CREATE POLICY "Members can view organization shift templates" ON shift_templates
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members can manage organization shift templates" ON shift_templates
    FOR ALL USING (is_organization_member(organization_id));

-- Shift template assignments policies
CREATE POLICY "Members can view template assignments" ON shift_template_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shift_templates
            WHERE shift_templates.id = shift_template_assignments.template_id
            AND is_organization_member(shift_templates.organization_id)
        )
    );

CREATE POLICY "Members can manage template assignments" ON shift_template_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM shift_templates
            WHERE shift_templates.id = shift_template_assignments.template_id
            AND is_organization_member(shift_templates.organization_id)
        )
    );

-- Organization settings policies
CREATE POLICY "Members can view organization settings" ON organization_settings
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Owners can manage organization settings" ON organization_settings
    FOR ALL USING (is_organization_admin(organization_id));

-- Scheduling rules policies
CREATE POLICY "Members can view organization scheduling rules" ON scheduling_rules
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Owners can manage organization scheduling rules" ON scheduling_rules
    FOR ALL USING (is_organization_admin(organization_id));

-- Employee preferences policies
CREATE POLICY "Members can view employee preferences" ON employee_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = employee_preferences.employee_id
            AND is_organization_member(employees.organization_id)
        )
    );

CREATE POLICY "Members can manage employee preferences" ON employee_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = employee_preferences.employee_id
            AND is_organization_member(employees.organization_id)
        )
    );

-- Holidays cache policies (public read access)
CREATE POLICY "Anyone can view holidays cache" ON holidays_cache
    FOR SELECT TO authenticated USING (true);

-- Verification codes policies (public access for auth flow)
CREATE POLICY "Anyone can insert verification codes" ON verification_codes
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can select verification codes" ON verification_codes
    FOR SELECT TO anon USING (true);

-- AI generation usage policies
CREATE POLICY "Users can view their own AI usage" ON ai_generation_usage
    FOR SELECT USING (profile_id = auth.uid() OR is_organization_member(organization_id));

CREATE POLICY "Users can manage their own AI usage" ON ai_generation_usage
    FOR ALL USING (profile_id = auth.uid());

-- Trading sundays policies (public read)
CREATE POLICY "Anyone can view active trading sundays" ON trading_sundays
    FOR SELECT TO authenticated USING (is_active = true);

-- Newsletter policies
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Subscribers can view their own subscription" ON newsletter_subscribers
    FOR SELECT USING (true);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_absences_updated_at BEFORE UPDATE ON employee_absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_preferences_updated_at BEFORE UPDATE ON employee_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_rules_updated_at BEFORE UPDATE ON scheduling_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generation_usage_updated_at BEFORE UPDATE ON ai_generation_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_sundays_updated_at BEFORE UPDATE ON trading_sundays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_campaigns_updated_at BEFORE UPDATE ON newsletter_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- Note: This schema assumes auth.users table exists (provided by Supabase Auth)
-- Make sure to run this in a Supabase project with Auth enabled
