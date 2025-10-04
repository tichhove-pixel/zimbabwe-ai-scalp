import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ArrowLeft, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Withdraw = () => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select()
        .eq("user_id", session.user.id)
        .single();

      setProfile(data);
    };

    loadProfile();
  }, [navigate]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const withdrawAmount = parseFloat(amount);
      const balanceField = currency === "USD" ? "usd_balance" : "zwl_balance";
      const currentBalance = parseFloat(profile?.[balanceField] || 0);

      if (withdrawAmount > currentBalance) {
        throw new Error("Insufficient balance");
      }

      // Create withdrawal transaction
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: session.user.id,
        type: "withdrawal",
        amount: withdrawAmount,
        currency,
        payment_method: "mobile",
        reference: phone,
        status: "pending",
      });

      if (txError) throw txError;

      // Update balance
      const newBalance = currentBalance - withdrawAmount;
      await supabase
        .from("profiles")
        .update({ [balanceField]: newBalance })
        .eq("user_id", session.user.id);

      toast({
        title: "Withdrawal requested!",
        description: "Your withdrawal request has been submitted. Funds will be processed within 24 hours.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = currency === "USD" 
    ? profile?.usd_balance || 0 
    : profile?.zwl_balance || 0;

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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-smooth">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="p-8 bg-card border-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Withdraw Funds</h2>
              <p className="text-sm text-muted-foreground">Request withdrawal to mobile money</p>
            </div>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ZWL">ZWL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Available: {currency} {parseFloat(maxAmount).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +263771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your EcoCash or ZIPIT registered number
              </p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Withdrawal requests are processed within 24 hours. 
                You'll receive a confirmation once funds are sent.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Request Withdrawal"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Withdraw;
