-- Tabela do śledzenia limitów generowania AI
CREATE TABLE IF NOT EXISTS ai_generation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    generation_count INT NOT NULL DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Jeden rekord na miesiąc dla każdej organizacji
    UNIQUE(organization_id, year, month)
);

-- Indeksy dla wydajności
CREATE INDEX idx_ai_generation_usage_org_date ON ai_generation_usage(organization_id, year, month);
CREATE INDEX idx_ai_generation_usage_profile ON ai_generation_usage(profile_id);

-- RLS Policies
ALTER TABLE ai_generation_usage ENABLE ROW LEVEL SECURITY;

-- Użytkownicy mogą czytać swoje limity
CREATE POLICY "Users can view their AI generation usage"
    ON ai_generation_usage FOR SELECT
    USING (
        profile_id = auth.uid() OR
        organization_id IN (
            SELECT id FROM organizations
            WHERE owner_id = auth.uid()
        )
    );

-- Użytkownicy mogą wstawiać swoje limity (tylko ownerzy organizacji)
CREATE POLICY "Users can insert AI generation usage"
    ON ai_generation_usage FOR INSERT
    WITH CHECK (
        profile_id = auth.uid() AND
        organization_id IN (
            SELECT id FROM organizations
            WHERE owner_id = auth.uid()
        )
    );

-- Użytkownicy mogą aktualizować swoje limity (tylko ownerzy organizacji)
CREATE POLICY "Users can update AI generation usage"
    ON ai_generation_usage FOR UPDATE
    USING (
        profile_id = auth.uid() AND
        organization_id IN (
            SELECT id FROM organizations
            WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        profile_id = auth.uid() AND
        organization_id IN (
            SELECT id FROM organizations
            WHERE owner_id = auth.uid()
        )
    );

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_ai_generation_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_generation_usage_updated_at
    BEFORE UPDATE ON ai_generation_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_generation_usage_updated_at();

-- Komentarze
COMMENT ON TABLE ai_generation_usage IS 'Śledzenie użycia generowania grafików AI - limit 3x/miesiąc';
COMMENT ON COLUMN ai_generation_usage.generation_count IS 'Liczba wygenerowanych grafików w danym miesiącu';
COMMENT ON COLUMN ai_generation_usage.last_generated_at IS 'Data ostatniego wygenerowania grafiku';
