import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowLeft, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const History = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select()
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setTransactions(txData || []);

      // Load trades
      const { data: tradeData } = await supabase
        .from("trades")
        .select()
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setTrades(tradeData || []);
    };

    loadData();
  }, [navigate]);

  const getStatusBadge = (status: string) => {
    const variants: any = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">ZimAI Trader</h1>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-smooth">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h2 className="text-3xl font-bold mb-6">Transaction History</h2>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="transactions">Deposits & Withdrawals</TabsTrigger>
            <TabsTrigger value="trades">Trading History</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card className="p-6 bg-card border-border">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <Card key={tx.id} className="p-4 bg-secondary border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tx.type === "deposit" ? "bg-accent/10" : "bg-destructive/10"
                          }`}>
                            {tx.type === "deposit" ? (
                              <ArrowDownRight className="h-5 w-5 text-accent" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold capitalize">{tx.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {tx.currency} {parseFloat(tx.amount).toFixed(2)}
                          </div>
                          <div className="mt-1">{getStatusBadge(tx.status)}</div>
                        </div>
                      </div>
                      {tx.payment_method && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          via {tx.payment_method}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="p-6 bg-card border-border">
              {trades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No trades yet</p>
              ) : (
                <div className="space-y-4">
                  {trades.map((trade) => (
                    <Card key={trade.id} className="p-4 bg-secondary border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{trade.symbol}</span>
                            <Badge variant={trade.side === "BUY" ? "default" : "destructive"}>
                              {trade.side}
                            </Badge>
                            {trade.instrument_type === 'option' && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                                {trade.option_type?.toUpperCase()} OPTION
                              </Badge>
                            )}
                            {trade.status === "open" && (
                              <Badge variant="secondary">OPEN</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {trade.instrument_type === 'option' ? (
                              <div className="space-y-1">
                                <div>Underlying: {trade.underlying_asset}</div>
                                <div>Strike: ${parseFloat(trade.strike_price || 0).toFixed(2)} | Expiry: {trade.expiration_date ? format(new Date(trade.expiration_date), "MMM dd, yyyy") : 'N/A'}</div>
                                <div>{trade.quantity} contracts ({trade.contract_size || 100} shares) @ ${parseFloat(trade.premium || 0).toFixed(2)}</div>
                              </div>
                            ) : (
                              <div>{trade.quantity} shares @ ${parseFloat(trade.entry_price).toFixed(2)}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {trade.pnl && (
                            <div className={`font-bold flex items-center gap-1 ${
                              parseFloat(trade.pnl) >= 0 ? "text-accent" : "text-destructive"
                            }`}>
                              {parseFloat(trade.pnl) >= 0 ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4" />
                              )}
                              ${Math.abs(parseFloat(trade.pnl)).toFixed(2)}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(trade.created_at), "MMM dd HH:mm")}
                          </div>
                        </div>
                      </div>
                      {trade.confidence && (
                        <div className="text-xs text-muted-foreground">
                          AI Confidence: {trade.confidence}%
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default History;
