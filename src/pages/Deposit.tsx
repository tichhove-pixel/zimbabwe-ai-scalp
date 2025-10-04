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

const Deposit = () => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("ecocash");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.from("transactions").insert({
        user_id: session.user.id,
        type: "deposit",
        amount: parseFloat(amount),
        currency,
        payment_method: paymentMethod,
        status: "completed", // In production, this would be 'pending' until PayNow confirms
      });

      if (error) throw error;

      // Update wallet balance (in production, this happens after PayNow confirmation)
      const { data: profile } = await supabase
        .from("profiles")
        .select()
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        const balanceField = currency === "USD" ? "usd_balance" : "zwl_balance";
        const currentBalance = parseFloat(String(profile[balanceField] || 0));
        const newBalance = currentBalance + parseFloat(amount);

        await supabase
          .from("profiles")
          .update({ [balanceField]: newBalance })
          .eq("user_id", session.user.id);
      }

      toast({
        title: "Deposit successful!",
        description: `${currency} ${amount} has been added to your wallet.`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-smooth">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="p-8 bg-card border-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Deposit Funds</h2>
              <p className="text-sm text-muted-foreground">Add money to your trading wallet</p>
            </div>
          </div>

          <form onSubmit={handleDeposit} className="space-y-6">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecocash">EcoCash</SelectItem>
                  <SelectItem value="zipit">ZIPIT</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> In this prototype, deposits are simulated instantly. 
                In production, PayNow integration will process real payments.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Complete Deposit"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Deposit;
