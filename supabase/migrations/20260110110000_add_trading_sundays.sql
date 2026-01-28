-- Tabela do przechowywania niedziel handlowych
CREATE TABLE IF NOT EXISTS trading_sundays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    day INT NOT NULL CHECK (day >= 1 AND day <= 31),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Walidacja: data musi być niedzielą
    CONSTRAINT check_sunday CHECK (EXTRACT(DOW FROM date) = 0)
);

-- Indeksy dla wydajności
CREATE INDEX idx_trading_sundays_date ON trading_sundays(date);
CREATE INDEX idx_trading_sundays_year_month ON trading_sundays(year, month);
CREATE INDEX idx_trading_sundays_active ON trading_sundays(is_active) WHERE is_active = true;

-- RLS Policies - wszyscy mogą czytać niedziele handlowe
ALTER TABLE trading_sundays ENABLE ROW LEVEL SECURITY;

-- Publiczny dostęp do odczytu
CREATE POLICY "Anyone can view trading sundays"
    ON trading_sundays FOR SELECT
    USING (true);

-- Tylko admini mogą modyfikować (do zaimplementowania po dodaniu roli admin)
-- Tymczasowo - tylko authenticated users
CREATE POLICY "Authenticated users can insert trading sundays"
    ON trading_sundays FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update trading sundays"
    ON trading_sundays FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete trading sundays"
    ON trading_sundays FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_trading_sundays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trading_sundays_updated_at
    BEFORE UPDATE ON trading_sundays
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_sundays_updated_at();

-- Funkcja pomocnicza do automatycznego wypełniania pól rok/miesiąc/dzień
CREATE OR REPLACE FUNCTION set_trading_sunday_date_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.year = EXTRACT(YEAR FROM NEW.date);
    NEW.month = EXTRACT(MONTH FROM NEW.date);
    NEW.day = EXTRACT(DAY FROM NEW.date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trading_sundays_set_date_fields
    BEFORE INSERT OR UPDATE ON trading_sundays
    FOR EACH ROW
    EXECUTE FUNCTION set_trading_sunday_date_fields();

-- Wstaw przykładowe niedziele handlowe na 2026 (w Polsce)
-- Niedziele handlowe w 2026: ostatnia niedziela stycznia, Wielkanoc, ostatnia niedziela kwietnia,
-- ostatnia niedziela czerwca, ostatnia niedziela sierpnia oraz 3 niedziele przed Bożym Narodzeniem
INSERT INTO trading_sundays (date, description) VALUES
    ('2026-01-25', 'Ostatnia niedziela stycznia'),
    ('2026-04-05', 'Niedziela wielkanocna'),
    ('2026-04-26', 'Ostatnia niedziela kwietnia'),
    ('2026-06-28', 'Ostatnia niedziela czerwca'),
    ('2026-08-30', 'Ostatnia niedziela sierpnia'),
    ('2026-12-06', '3 niedziela przed Bożym Narodzeniem'),
    ('2026-12-13', '2 niedziela przed Bożym Narodzeniem'),
    ('2026-12-20', 'Niedziela przed Bożym Narodzeniem')
ON CONFLICT (date) DO NOTHING;

-- Komentarze
COMMENT ON TABLE trading_sundays IS 'Lista niedziel handlowych w Polsce - sklepy mogą być otwarte';
COMMENT ON COLUMN trading_sundays.is_active IS 'Czy niedziela handlowa jest aktywna (można ją wyłączyć bez usuwania)';
COMMENT ON COLUMN trading_sundays.description IS 'Opcjonalny opis niedzieli handlowej (np. powód)';
