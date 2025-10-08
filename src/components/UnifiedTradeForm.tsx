import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAlpacaData } from "@/hooks/useAlpacaData";

export const UnifiedTradeForm = () => {
  const { toast } = useToast();
  const { placeOrder, getQuote, loading: alpacaLoading } = useAlpacaData();
  const [loading, setLoading] = useState(false);
  const [instrumentType, setInstrumentType] = useState<'stock' | 'option' | 'forex' | 'crypto'>('stock');

  // Stock/Crypto/Forex form data
  const [stockData, setStockData] = useState({
    symbol: "",
    quantity: "",
    side: "BUY",
  });

  // Options form data
  const [optionData, setOptionData] = useState({
    underlying_asset: "",
    option_type: "CALL",
    strike_price: "",
    expiry_date: "",
    quantity: "",
    premium: "",
    side: "BUY",
  });

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current price from Alpaca
      const quote = await getQuote(stockData.symbol, instrumentType);
      const currentPrice = quote?.ap || quote?.ask_price || 0;

      // Place order via Alpaca
      await placeOrder(
        stockData.symbol,
        parseInt(stockData.quantity),
        stockData.side.toLowerCase() as 'buy' | 'sell',
        instrumentType
      );

      // Save to database
      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        symbol: stockData.symbol,
        side: stockData.side,
        quantity: parseInt(stockData.quantity),
        entry_price: currentPrice,
        instrument_type: instrumentType,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Trade Placed",
        description: `${instrumentType.toUpperCase()} trade for ${stockData.symbol} placed successfully`,
      });

      setStockData({ symbol: "", quantity: "", side: "BUY" });
    } catch (error: any) {
      console.error("Error placing trade:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        symbol: `${optionData.underlying_asset} ${optionData.strike_price}${optionData.option_type[0]}`,
        side: optionData.side,
        quantity: parseInt(optionData.quantity),
        entry_price: parseFloat(optionData.premium),
        instrument_type: 'option',
        underlying_asset: optionData.underlying_asset,
        strike_price: parseFloat(optionData.strike_price),
        option_type: optionData.option_type,
        expiry_date: optionData.expiry_date,
        premium: parseFloat(optionData.premium),
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Options Trade Placed",
        description: `Options trade placed successfully`,
      });

      setOptionData({
        underlying_asset: "",
        option_type: "CALL",
        strike_price: "",
        expiry_date: "",
        quantity: "",
        premium: "",
        side: "BUY",
      });
    } catch (error: any) {
      console.error("Error placing option trade:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Trade</CardTitle>
        <CardDescription>Execute trades across multiple asset classes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={instrumentType} onValueChange={(v) => setInstrumentType(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stock">Stocks</TabsTrigger>
            <TabsTrigger value="option">Options</TabsTrigger>
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <Label>Symbol</Label>
                <Input
                  value={stockData.symbol}
                  onChange={(e) => setStockData({ ...stockData, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  required
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <Label>Side</Label>
                <Select value={stockData.side} onValueChange={(v) => setStockData({ ...stockData, side: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || alpacaLoading} className="w-full">
                {loading ? "Placing Trade..." : "Place Stock Trade"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="forex">
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <Label>Currency Pair</Label>
                <Input
                  value={stockData.symbol}
                  onChange={(e) => setStockData({ ...stockData, symbol: e.target.value.toUpperCase() })}
                  placeholder="EUR/USD"
                  required
                />
              </div>
              <div>
                <Label>Lot Size</Label>
                <Input
                  type="number"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <Label>Side</Label>
                <Select value={stockData.side} onValueChange={(v) => setStockData({ ...stockData, side: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || alpacaLoading} className="w-full">
                {loading ? "Placing Trade..." : "Place Forex Trade"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="crypto">
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <Label>Cryptocurrency</Label>
                <Input
                  value={stockData.symbol}
                  onChange={(e) => setStockData({ ...stockData, symbol: e.target.value.toUpperCase() })}
                  placeholder="BTC/USD"
                  required
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                  placeholder="0.1"
                  required
                />
              </div>
              <div>
                <Label>Side</Label>
                <Select value={stockData.side} onValueChange={(v) => setStockData({ ...stockData, side: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || alpacaLoading} className="w-full">
                {loading ? "Placing Trade..." : "Place Crypto Trade"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="option">
            <form onSubmit={handleOptionSubmit} className="space-y-4">
              <div>
                <Label>Underlying Asset</Label>
                <Input
                  value={optionData.underlying_asset}
                  onChange={(e) => setOptionData({ ...optionData, underlying_asset: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  required
                />
              </div>
              <div>
                <Label>Option Type</Label>
                <Select value={optionData.option_type} onValueChange={(v) => setOptionData({ ...optionData, option_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="PUT">Put</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Strike Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={optionData.strike_price}
                  onChange={(e) => setOptionData({ ...optionData, strike_price: e.target.value })}
                  placeholder="150.00"
                  required
                />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={optionData.expiry_date}
                  onChange={(e) => setOptionData({ ...optionData, expiry_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Quantity (Contracts)</Label>
                <Input
                  type="number"
                  value={optionData.quantity}
                  onChange={(e) => setOptionData({ ...optionData, quantity: e.target.value })}
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <Label>Premium per Contract</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={optionData.premium}
                  onChange={(e) => setOptionData({ ...optionData, premium: e.target.value })}
                  placeholder="5.50"
                  required
                />
              </div>
              <div>
                <Label>Side</Label>
                <Select value={optionData.side} onValueChange={(v) => setOptionData({ ...optionData, side: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Placing Trade..." : "Place Options Trade"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
