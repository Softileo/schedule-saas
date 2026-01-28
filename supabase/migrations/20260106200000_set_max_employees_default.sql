-- Ustaw max_employees = min_employees dla szablonów gdzie max jest NULL
-- To zapewni że szablony z min=2 będą miały też max=2

UPDATE shift_templates 
SET max_employees = min_employees 
WHERE max_employees IS NULL;

-- Opcjonalnie: dodaj komentarz wyjaśniający
COMMENT ON COLUMN shift_templates.max_employees IS 'Maksymalna liczba pracowników na zmianę. Jeśli równe min_employees, wymusza dokładną liczbę.';
