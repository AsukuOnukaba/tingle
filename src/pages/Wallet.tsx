import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, Bitcoin, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const paymentMethods = [
  {
    name: "USDC (Solana)",
    icon: Bitcoin,
    type: "crypto",
    description: "Instant crypto payments",
    badge: "Recommended",
    color: "text-primary",
  },
  {
    name: "Bitcoin",
    icon: Bitcoin,
    type: "crypto",
    description: "BTC payments via Lightning",
    color: "text-secondary",
  },
  {
    name: "Ethereum",
    icon: Bitcoin,
    type: "crypto",
    description: "ETH & ERC-20 tokens",
    color: "text-accent",
  },
  {
    name: "PayPal",
    icon: CreditCard,
    type: "traditional",
    description: "Credit/Debit cards",
    color: "text-blue-500",
  },
  {
    name: "Paystack",
    icon: Banknote,
    type: "traditional",
    description: "African payment gateway",
    color: "text-green-500",
  },
];

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchBalance();

    // Subscribe to wallet changes
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setBalance(data.balance);
    }
  };

  const handleAddFunds = async (method: string) => {
    if (!user || !amount) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount to add.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);
      
      // For demo purposes, directly add to wallet
      const { error } = await supabase
        .from("wallets")
        .update({ balance: balance + numericAmount })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Funds added!",
        description: `$${numericAmount.toFixed(2)} added to your wallet via ${method}.`,
      });
      setAmount("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add funds.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Wallet
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your balance and payment methods
            </p>
          </div>

          {/* Balance Card */}
          <Card className="glass-card border-border/50 mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
                <WalletIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm text-muted-foreground mb-2">Available Balance</div>
              <div className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ${balance.toFixed(2)}
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" className="bg-muted/50 border-border/50 hover:bg-muted">
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Funds Section */}
          <Tabs defaultValue="add" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <TabsList className="grid grid-cols-2 mb-8 bg-muted/50">
              <TabsTrigger value="add" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Funds
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Transaction History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add">
              <Card className="glass-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle>Amount to Add</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-muted/50 border-border/50 text-2xl h-14"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAmount("10")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        $10
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAmount("50")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        $50
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAmount("100")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        $100
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle>Select Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.name}
                          onClick={() => handleAddFunds(method.name)}
                          disabled={loading}
                          className="glass-card p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-smooth text-left group hover-scale"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full bg-muted/50 ${method.color}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-semibold flex items-center gap-2">
                                  {method.name}
                                  {method.badge && (
                                    <Badge variant="secondary" className="gradient-primary text-white text-xs">
                                      {method.badge}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{method.description}</div>
                              </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-smooth" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="glass-card border-border/50">
                <CardContent className="p-12 text-center">
                  <ArrowUpRight className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
