import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
const ALPACA_API_SECRET = Deno.env.get('ALPACA_API_SECRET');
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      throw new Error('Alpaca API credentials not configured');
    }

    const { action, symbol, symbols, qty, side, type = 'market', time_in_force = 'day', instrument_type = 'stock' } = await req.json();
    
    const alpacaHeaders = {
      'APCA-API-KEY-ID': ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'getQuote': {
        // Get latest quote for a symbol
        const assetClass = instrument_type === 'crypto' ? 'crypto' : 'us_equity';
        const endpoint = instrument_type === 'crypto' 
          ? `${ALPACA_BASE_URL}/v1beta3/crypto/us/latest/quotes?symbols=${symbol}`
          : `${ALPACA_BASE_URL}/v2/stocks/${symbol}/quotes/latest`;
        
        response = await fetch(endpoint, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      case 'getQuotes': {
        // Get quotes for multiple symbols
        const symbolList = symbols.join(',');
        const endpoint = `${ALPACA_BASE_URL}/v2/stocks/quotes/latest?symbols=${symbolList}`;
        
        response = await fetch(endpoint, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      case 'placeOrder': {
        // Place a paper trade order
        const orderPayload = {
          symbol,
          qty,
          side,
          type,
          time_in_force,
        };

        response = await fetch(`${ALPACA_BASE_URL}/v2/orders`, {
          method: 'POST',
          headers: alpacaHeaders,
          body: JSON.stringify(orderPayload),
        });
        break;
      }

      case 'getPositions': {
        // Get all open positions
        response = await fetch(`${ALPACA_BASE_URL}/v2/positions`, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      case 'getAccount': {
        // Get account information
        response = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      case 'getOrders': {
        // Get recent orders
        response = await fetch(`${ALPACA_BASE_URL}/v2/orders?status=all&limit=50`, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      case 'searchAssets': {
        // Search for tradeable assets
        const assetClass = instrument_type === 'crypto' ? 'crypto' : 'us_equity';
        response = await fetch(`${ALPACA_BASE_URL}/v2/assets?status=active&asset_class=${assetClass}`, {
          method: 'GET',
          headers: alpacaHeaders,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alpaca API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Alpaca API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in alpaca-market-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
