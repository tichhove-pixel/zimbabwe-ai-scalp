import { useState, useEffect, useCallback } from "react";

interface DemoTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "open" | "closed";
  quantity: number;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  confidence: number;
  created_at: string;
  closed_at?: string;
}

interface DemoSignal {
  symbol: string;
  action: "BUY" | "SELL";
  confidence: number;
  reason: string;
}

const SYMBOLS = [
  "SEED CO", "TURNALL", "DELTA", "ECONET", "INNSCOR",
  "OK ZIMBABWE", "SIMBISA", "CBZ", "FBC", "NMBZ",
  "AAPL", "GOOGL", "TSLA", "EUR/USD", "GBP/USD", 
  "BTC/USD", "ETH/USD", "XRP/USD"
];

const REASONS = [
  "Strong upward momentum detected",
  "Resistance level approaching",
  "Volume spike detected",
  "Bullish pattern formation",
  "Support level reached",
  "Moving average crossover",
  "RSI oversold condition",
  "Breakout confirmation"
];

export const useDemoTrading = (aiEnabled: boolean) => {
  const [demoPositions, setDemoPositions] = useState<DemoTrade[]>([]);
  const [demoRecentTrades, setDemoRecentTrades] = useState<DemoTrade[]>([]);
  const [demoSignals, setDemoSignals] = useState<DemoSignal[]>([]);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);

  // Generate random signal
  const generateSignal = useCallback((): DemoSignal => {
    return {
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      action: Math.random() > 0.5 ? "BUY" : "SELL",
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
      reason: REASONS[Math.floor(Math.random() * REASONS.length)]
    };
  }, []);

  // Generate random trade
  const generateTrade = useCallback((): DemoTrade => {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const quantity = Math.floor(Math.random() * 900) + 100; // 100-1000 shares
    const entry_price = Math.random() * 50 + 10; // $10-$60

    return {
      id: `demo-${Date.now()}-${Math.random()}`,
      symbol,
      side,
      status: "open",
      quantity,
      entry_price,
      confidence: Math.floor(Math.random() * 30) + 70,
      created_at: new Date().toISOString()
    };
  }, []);

  // Close a position
  const closeTrade = useCallback((trade: DemoTrade) => {
    const priceChange = (Math.random() * 0.1 - 0.05) * trade.entry_price; // -5% to +5%
    const exit_price = trade.entry_price + priceChange;
    const pnl = trade.side === "BUY" 
      ? (exit_price - trade.entry_price) * trade.quantity
      : (trade.entry_price - exit_price) * trade.quantity;

    return {
      ...trade,
      status: "closed" as const,
      exit_price,
      pnl,
      closed_at: new Date().toISOString()
    };
  }, []);

  // Initialize demo data
  useEffect(() => {
    if (aiEnabled) {
      // Generate initial signals
      setDemoSignals([generateSignal(), generateSignal()]);
      
      // Generate initial positions
      const initialPositions = Array.from({ length: 3 }, () => generateTrade());
      setDemoPositions(initialPositions);
      
      setTradeCount(Math.floor(Math.random() * 5) + 8); // 8-12 trades
    } else {
      setDemoPositions([]);
      setDemoSignals([]);
      setTradeCount(0);
    }
  }, [aiEnabled, generateSignal, generateTrade]);

  // Simulate live trading activity
  useEffect(() => {
    if (!aiEnabled) return;

    // Update signals every 8 seconds
    const signalInterval = setInterval(() => {
      setDemoSignals(prev => {
        const newSignal = generateSignal();
        return [newSignal, prev[0]]; // Keep 2 signals
      });
    }, 8000);

    // Open new positions every 12 seconds
    const openTradeInterval = setInterval(() => {
      if (demoPositions.length < 5) {
        const newTrade = generateTrade();
        setDemoPositions(prev => [...prev, newTrade]);
        setTradeCount(prev => prev + 1);
      }
    }, 12000);

    // Close positions every 15 seconds
    const closeTradeInterval = setInterval(() => {
      setDemoPositions(prev => {
        if (prev.length === 0) return prev;
        
        const randomIndex = Math.floor(Math.random() * prev.length);
        const tradeToClose = prev[randomIndex];
        const closedTrade = closeTrade(tradeToClose);
        
        // Update recent trades
        setDemoRecentTrades(prevRecent => {
          const updated = [closedTrade, ...prevRecent];
          return updated.slice(0, 5); // Keep only 5 recent trades
        });
        
        // Update daily P&L
        setDailyPnL(prevPnL => prevPnL + (closedTrade.pnl || 0));
        
        // Remove from positions
        return prev.filter((_, idx) => idx !== randomIndex);
      });
    }, 15000);

    // Update P&L for open positions every 3 seconds
    const pnlUpdateInterval = setInterval(() => {
      setDemoPositions(prev => 
        prev.map(pos => {
          const priceChange = (Math.random() * 0.04 - 0.02) * pos.entry_price; // -2% to +2%
          const current_price = pos.entry_price + priceChange;
          const pnl = pos.side === "BUY"
            ? (current_price - pos.entry_price) * pos.quantity
            : (pos.entry_price - current_price) * pos.quantity;
          
          return { ...pos, pnl };
        })
      );
    }, 3000);

    return () => {
      clearInterval(signalInterval);
      clearInterval(openTradeInterval);
      clearInterval(closeTradeInterval);
      clearInterval(pnlUpdateInterval);
    };
  }, [aiEnabled, demoPositions.length, generateSignal, generateTrade, closeTrade]);

  const totalPnL = demoRecentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return {
    demoPositions,
    demoRecentTrades,
    demoSignals,
    dailyPnL,
    totalPnL,
    tradeCount
  };
};
