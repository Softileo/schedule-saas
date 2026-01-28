-- ============================================
-- MIGRACJA: Nieobecności pracowników i przypisania do szablonów
-- Data: 2025-12-28
-- ============================================

-- ============================================
-- TYPY NIEOBECNOŚCI
-- ============================================

DO $$ BEGIN
    CREATE TYPE absence_type AS ENUM (
        'vacation',           -- Urlop wypoczynkowy
        'sick_leave',         -- L4 (zwolnienie lekarskie)
        'on_demand',          -- Urlop na żądanie (UZ)
        'unpaid_leave',       -- Urlop bezpłatny
        'training_paid',      -- Szkolenie w czasie pracy (płatne)
        'training_unpaid',    -- Szkolenie poza godzinami (niepłatne)
        'day_off',            -- Dzień wolny (np. za święto)
        'child_care',         -- Opieka nad dzieckiem
        'maternity',          -- Urlop macierzyński
        'paternity',          -- Urlop ojcowski
        'other'               -- Inne
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELA NIEOBECNOŚCI PRACOWNIKÓW
-- ============================================

-- Usuń starą wersję tabeli jeśli istnieje (może nie mieć wszystkich kolumn)
DROP TABLE IF EXISTS employee_absences CASCADE;

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Walidacja: data końca >= data początku
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ============================================
-- TABELA PRZYPISAŃ PRACOWNIKÓW DO SZABLONÓW
-- ============================================

-- Tabela łącząca szablony zmian z pracownikami
-- Jeśli szablon ma przypisanych pracowników, tylko oni mogą mieć tę zmianę
-- Jeśli brak przypisań - wszyscy mogą mieć tę zmianę

DROP TABLE IF EXISTS shift_template_assignments CASCADE;

CREATE TABLE shift_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unikalność - jeden pracownik może być przypisany do szablonu tylko raz
    UNIQUE(template_id, employee_id)
);

-- ============================================
-- INDEKSY
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employee_absences_employee ON employee_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_org ON employee_absences(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_dates ON employee_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_employee_absences_type ON employee_absences(absence_type);

CREATE INDEX IF NOT EXISTS idx_shift_template_assignments_template ON shift_template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_shift_template_assignments_employee ON shift_template_assignments(employee_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_template_assignments ENABLE ROW LEVEL SECURITY;

-- Polityki dla employee_absences
CREATE POLICY "Members can view absences" ON employee_absences
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create absences" ON employee_absences
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update absences" ON employee_absences
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete absences" ON employee_absences
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Polityki dla shift_template_assignments
CREATE POLICY "Members can view template assignments" ON shift_template_assignments
    FOR SELECT USING (
        template_id IN (
            SELECT st.id FROM shift_templates st
            JOIN organization_members om ON st.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create template assignments" ON shift_template_assignments
    FOR INSERT WITH CHECK (
        template_id IN (
            SELECT st.id FROM shift_templates st
            JOIN organization_members om ON st.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete template assignments" ON shift_template_assignments
    FOR DELETE USING (
        template_id IN (
            SELECT st.id FROM shift_templates st
            JOIN organization_members om ON st.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERY
-- ============================================

DROP TRIGGER IF EXISTS update_employee_absences_updated_at ON employee_absences;
CREATE TRIGGER update_employee_absences_updated_at
    BEFORE UPDATE ON employee_absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNKCJE POMOCNICZE
-- ============================================

-- Funkcja sprawdzająca czy pracownik ma nieobecność w danym dniu
CREATE OR REPLACE FUNCTION check_employee_absence(
    p_employee_id UUID,
    p_date DATE
)
RETURNS TABLE (
    has_absence BOOLEAN,
    absence_type absence_type,
    is_paid BOOLEAN,
    notes TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Funkcja sprawdzająca czy pracownik może mieć daną zmianę
CREATE OR REPLACE FUNCTION can_employee_have_shift(
    p_employee_id UUID,
    p_template_id UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;
