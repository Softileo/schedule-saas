-- =============================================================================
-- MIGRACJA: Dodanie brakujących indeksów optymalizacyjnych
-- =============================================================================
-- Data: 2026-01-05
-- Autor: Senior Developer Optimization
-- Cel: Poprawa wydajności najczęstszych zapytań
-- =============================================================================

-- 1. Composite index dla szybszego wyszukiwania zmian po schedule i dacie
-- Używane w: grafik/page.tsx, schedule operations
CREATE INDEX IF NOT EXISTS idx_shifts_schedule_date 
ON shifts(schedule_id, date);

-- 2. Partial index dla aktywnych pracowników (najczęstszy use case)
-- Używane w: employee queries, schedule generation
CREATE INDEX IF NOT EXISTS idx_employees_active_only 
ON employees(organization_id) 
WHERE is_active = true;

-- 3. Index dla holidays cache lookup
-- Używane w: fetchHolidays, schedule generation
CREATE INDEX IF NOT EXISTS idx_holidays_cache_lookup 
ON holidays_cache(year, country_code);

-- 4. Index dla wygasłych kodów weryfikacyjnych
-- Używane w: cleanup jobs, verification (lookup by expires_at)
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires 
ON verification_codes(expires_at);

-- 5. Composite index dla absencji - zapytania po pracowniku i zakresie dat
-- Używane w: schedule validation, absence checks
CREATE INDEX IF NOT EXISTS idx_absences_employee_dates 
ON employee_absences(employee_id, start_date, end_date);

-- 6. Index dla shift_template_assignments - szybsze sprawdzanie uprawnień
-- Używane w: DnD validation, schedule generation
CREATE INDEX IF NOT EXISTS idx_template_assignments_composite 
ON shift_template_assignments(template_id, employee_id);
