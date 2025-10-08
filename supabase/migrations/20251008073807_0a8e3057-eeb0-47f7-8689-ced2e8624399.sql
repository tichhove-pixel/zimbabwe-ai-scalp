-- Add instrument_type to trades table to support stocks, options, forex, and crypto
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS instrument_type text DEFAULT 'stock';

-- Add constraint for valid instrument types
ALTER TABLE public.trades
ADD CONSTRAINT valid_instrument_type 
CHECK (instrument_type IN ('stock', 'option', 'forex', 'crypto'));

-- Add columns for forex/crypto specific data
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS underlying_asset text,
ADD COLUMN IF NOT EXISTS strike_price numeric,
ADD COLUMN IF NOT EXISTS option_type text,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS premium numeric,
ADD COLUMN IF NOT EXISTS contract_size integer;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_trades_instrument_type ON public.trades(instrument_type);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);