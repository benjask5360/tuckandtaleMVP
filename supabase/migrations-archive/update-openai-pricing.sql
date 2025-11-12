-- Update OpenAI pricing in api_prices table
-- GPT-4o pricing: $2.50 per 1M input tokens, $10.00 per 1M output tokens
-- For simplicity, we'll use an average of $6.25 per 1M tokens ($0.00000625 per token)

UPDATE api_prices 
SET 
  cost_per_unit = 0.00000625,
  notes = 'OpenAI GPT-4o average cost per token ($2.50/1M input + $10/1M output)'
WHERE provider = 'openai';
