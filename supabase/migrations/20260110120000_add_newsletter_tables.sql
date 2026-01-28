-- Tabela do przechowywania subskrybentów newslettera
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    subscribed_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    source VARCHAR(50) DEFAULT 'website', -- website, admin, import
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy dla wydajności
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_active ON newsletter_subscribers(is_active) WHERE is_active = true;
CREATE INDEX idx_newsletter_subscribers_subscribed ON newsletter_subscribers(subscribed_at);

-- Tabela do przechowywania wysłanych newsletterów
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
    recipients_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy dla wydajności
CREATE INDEX idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX idx_newsletter_campaigns_sent_at ON newsletter_campaigns(sent_at);
CREATE INDEX idx_newsletter_campaigns_sent_by ON newsletter_campaigns(sent_by);

-- RLS Policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Newsletter subscribers - tylko authenticated users mogą zarządzać
CREATE POLICY "Authenticated users can view subscribers"
    ON newsletter_subscribers FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert subscribers"
    ON newsletter_subscribers FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update subscribers"
    ON newsletter_subscribers FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete subscribers"
    ON newsletter_subscribers FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Newsletter campaigns - tylko authenticated users mogą zarządzać
CREATE POLICY "Authenticated users can view campaigns"
    ON newsletter_campaigns FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert campaigns"
    ON newsletter_campaigns FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaigns"
    ON newsletter_campaigns FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaigns"
    ON newsletter_campaigns FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Triggers do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_newsletter_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_subscribers_updated_at
    BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_subscribers_updated_at();

CREATE OR REPLACE FUNCTION update_newsletter_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_campaigns_updated_at
    BEFORE UPDATE ON newsletter_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_campaigns_updated_at();

-- Komentarze
COMMENT ON TABLE newsletter_subscribers IS 'Subskrybenci newslettera';
COMMENT ON TABLE newsletter_campaigns IS 'Kampanie newsletterowe';
COMMENT ON COLUMN newsletter_subscribers.is_active IS 'Czy subskrypcja jest aktywna';
COMMENT ON COLUMN newsletter_campaigns.status IS 'Status kampanii: draft, scheduled, sending, sent, failed';
