-- Create API Prices Table
-- Stores the real USD cost per unit for each API provider

CREATE TABLE IF NOT EXISTS public.api_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text UNIQUE NOT NULL CHECK (provider IN ('leonardo', 'openai', 'anthropic')),
  cost_per_unit decimal(10, 6), -- Nullable to allow NULL for providers not yet configured
  unit_type text NOT NULL CHECK (unit_type IN ('credit', 'token')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.api_prices ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read pricing (needed for cost calculations)
CREATE POLICY "Allow authenticated users to read api_prices"
  ON public.api_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify pricing
CREATE POLICY "Only service role can modify api_prices"
  ON public.api_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed initial pricing data
INSERT INTO public.api_prices (provider, cost_per_unit, unit_type, notes) VALUES
  ('leonardo', 0.00196, 'credit', 'Leonardo AI cost per credit'),
  ('openai', NULL, 'token', 'OpenAI cost per token - to be configured'),
  ('anthropic', NULL, 'token', 'Claude/Anthropic cost per token - to be configured')
ON CONFLICT (provider) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_prices_provider ON public.api_prices(provider);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_api_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_prices_updated_at
  BEFORE UPDATE ON public.api_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_api_prices_updated_at();

COMMENT ON TABLE public.api_prices IS 'Stores real USD cost per unit for each API provider (e.g., Leonardo $0.00196/credit)';
COMMENT ON COLUMN public.api_prices.cost_per_unit IS 'Cost in USD per unit (credit or token)';
COMMENT ON COLUMN public.api_prices.unit_type IS 'Type of unit being charged: credit (Leonardo) or token (OpenAI/Anthropic)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Created api_prices table!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Seeded with:';
  RAISE NOTICE '  ✓ Leonardo: $0.00196 per credit';
  RAISE NOTICE '  ✓ OpenAI: NULL (to be configured)';
  RAISE NOTICE '  ✓ Anthropic: NULL (to be configured)';
  RAISE NOTICE '============================================';
END $$;
