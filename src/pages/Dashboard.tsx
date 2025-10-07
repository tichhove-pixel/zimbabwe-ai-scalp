import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Brain,
  Power,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  LogOut,
  Shield,
  FileText,
  Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { OptionsTradeForm } from "@/components/OptionsTradeForm";

const Dashboard = () => {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: userRoles } = useUserRole();

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select()
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);

      // Load open positions
      const { data: positionsData } = await supabase
        .from("trades")
        .select()
        .eq("user_id", session.user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      setPositions(positionsData || []);

      // Load recent closed trades
      const { data: tradesData } = await supabase
        .from("trades")
        .select()
        .eq("user_id", session.user.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(5);

      setRecentTrades(tradesData || []);
    };

    loadData();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const walletBalance = {
    usd: parseFloat(profile?.usd_balance || 0),
    zwl: parseFloat(profile?.zwl_balance || 0)
  };

  const dailyPnL = 0;
  const dailyPnLPercent = 0;
  const totalPnL = recentTrades.reduce((sum, t) => sum + parseFloat(t.pnl || 0), 0);

  const aiSignals = [
    { symbol: "SEED CO", action: "BUY", confidence: 92, reason: "Strong upward momentum detected" },
    { symbol: "TURNALL", action: "SELL", confidence: 78, reason: "Resistance level approaching" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">ZimAI Trader</h1>
            </div>
            <div className="hidden md:flex gap-4 text-sm">
              <Link to="/dashboard" className="text-foreground font-semibold">Dashboard</Link>
              <Link to="/deposit" className="text-muted-foreground hover:text-foreground transition-smooth">Deposit</Link>
              <Link to="/withdraw" className="text-muted-foreground hover:text-foreground transition-smooth">Withdraw</Link>
              <Link to="/history" className="text-muted-foreground hover:text-foreground transition-smooth">History</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="options">Options Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {/* Enterprise Controls - Only visible to admin/compliance/auditor roles */}
        {userRoles && userRoles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Enterprise Controls
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {userRoles.includes('admin') && (
                <Card className="p-4 bg-card border-border hover:bg-accent/5 cursor-pointer transition-smooth" onClick={() => navigate('/admin')}>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Admin Panel</h3>
                  <p className="text-xs text-muted-foreground">Manage user roles</p>
                </Card>
              )}
              {(userRoles.includes('admin') || userRoles.includes('auditor')) && (
                <Card className="p-4 bg-card border-border hover:bg-accent/5 cursor-pointer transition-smooth" onClick={() => navigate('/audit-log')}>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Audit Log</h3>
                  <p className="text-xs text-muted-foreground">View system history</p>
                </Card>
              )}
              {(userRoles.includes('admin') || userRoles.includes('trader') || userRoles.includes('operator')) && (
                <Card className="p-4 bg-card border-border hover:bg-accent/5 cursor-pointer transition-smooth" onClick={() => navigate('/model-registry')}>
                  <Brain className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Model Registry</h3>
                  <p className="text-xs text-muted-foreground">AI governance</p>
                </Card>
              )}
              {(userRoles.includes('admin') || userRoles.includes('compliance')) && (
                <Card className="p-4 bg-card border-border hover:bg-accent/5 cursor-pointer transition-smooth" onClick={() => navigate('/compliance')}>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Compliance</h3>
                  <p className="text-xs text-muted-foreground">KYC/AML monitoring</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Wallet & Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">USD Wallet</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">${walletBalance.usd.toFixed(2)}</div>
            <Link to="/deposit" className="mt-4 w-full block">
              <Button variant="profit" size="sm" className="w-full">Deposit</Button>
            </Link>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">ZWL Wallet</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">ZWL {walletBalance.zwl.toLocaleString()}</div>
            <Link to="/deposit" className="mt-4 w-full block">
              <Button variant="outline" size="sm" className="w-full">Deposit</Button>
            </Link>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Daily P&L</span>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">${dailyPnL.toFixed(2)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Today's performance</p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total P&L</span>
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
            <div className="text-3xl font-bold text-accent">${totalPnL.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">All time profits</div>
          </Card>
        </div>

        {/* AI Control Panel */}
        <Card className="p-6 mb-8 bg-card border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${aiEnabled ? 'gradient-accent shadow-profit' : 'bg-secondary'}`}>
                <Brain className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">AI Trading Engine</h3>
                <p className="text-sm text-muted-foreground">
                  {aiEnabled ? "AI is actively monitoring markets and executing trades" : "AI trading is currently disabled"}
                </p>
              </div>
            </div>
            <Button 
              variant={aiEnabled ? "destructive" : "profit"} 
              size="lg"
              onClick={() => setAiEnabled(!aiEnabled)}
              className="gap-2"
            >
              <Power className="h-5 w-5" />
              {aiEnabled ? "Stop AI" : "Start AI"}
            </Button>
          </div>

          {aiEnabled && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Daily Loss Limit</div>
                  <div className="flex items-center gap-2">
                    <Progress value={25} className="flex-1" />
                    <span className="text-sm font-semibold">25%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Position Size</div>
                  <div className="flex items-center gap-2">
                    <Progress value={40} className="flex-1" />
                    <span className="text-sm font-semibold">40%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Trade Frequency</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-accent">12</div>
                    <span className="text-sm text-muted-foreground">trades today</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Positions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-bold mb-4">Active Positions</h3>
              {positions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active positions</p>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => (
                    <Card key={pos.id} className="p-4 bg-secondary border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{pos.symbol}</span>
                            <Badge variant={pos.side === "BUY" ? "default" : "destructive"} className="text-xs">
                              {pos.side}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {pos.quantity} shares @ ${parseFloat(pos.entry_price).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          {pos.pnl && (
                            <div className="flex items-center gap-1 text-accent font-bold">
                              <ArrowUpRight className="h-4 w-4" />
                              ${parseFloat(pos.pnl).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      {pos.confidence && (
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="text-xs text-muted-foreground">AI Confidence:</span>
                          <Progress value={pos.confidence} className="flex-1 h-2" />
                          <span className="text-xs font-semibold text-primary">{pos.confidence}%</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-bold mb-4">Recent Trades</h3>
              {recentTrades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No trades yet</p>
              ) : (
                <div className="space-y-2">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.side === "BUY" ? "default" : "outline"} className="w-14">
                          {trade.side}
                        </Badge>
                        <div>
                          <div className="font-semibold">{trade.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trade.closed_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{trade.quantity} @ ${parseFloat(trade.entry_price).toFixed(2)}</div>
                        {trade.pnl && (
                          <div className={`text-sm ${parseFloat(trade.pnl) >= 0 ? 'text-accent' : 'text-destructive'}`}>
                            {parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* AI Signals */}
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Signals
              </h3>
              <div className="space-y-4">
                {aiSignals.map((signal, i) => (
                  <Card key={i} className="p-4 bg-secondary border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{signal.symbol}</span>
                      <Badge variant={signal.action === "BUY" ? "default" : "destructive"}>
                        {signal.action}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">{signal.reason}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={signal.confidence} className="flex-1 h-2" />
                      <span className="text-xs font-semibold text-primary">{signal.confidence}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-destructive/10 border-destructive/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Risk Notice</h4>
                  <p className="text-sm text-muted-foreground">
                    Trading involves risk. Past performance does not guarantee future results. Only trade with money you can afford to lose.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="options">
            <OptionsTradeForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
