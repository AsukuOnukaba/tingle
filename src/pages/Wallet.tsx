import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, Bitcoin, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"bank" | "bitcoin" | "paystack">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bitcoinAddress, setbitcoinAddress] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchBalance();
    fetchTransactions();

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

    // Subscribe to transaction changes
    const txChannel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(txChannel);
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

  const fetchTransactions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setTransactions(data);
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

    if (method !== "Paystack") {
      toast({
        title: "Coming Soon",
        description: `${method} integration is not yet available. Please use Paystack.`,
        variant: "default",
      });
      return;
    }

    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);
      
      const { data, error } = await supabase.functions.invoke('wallet-topup', {
        body: {
          user_id: user.id,
          amount: numericAmount,
          currency: "NGN",
          email: user.email,
          provider: "paystack"
        },
      });

      if (error) throw error;

      if (data?.authorization?.data?.authorization_url) {
        window.location.href = data.authorization.data.authorization_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (error: any) {
      console.error('Top-up error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount) {
      toast({
        title: "Invalid input",
        description: "Please enter withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawMethod === "bank" && (!accountNumber || !bankCode)) {
      toast({
        title: "Invalid input",
        description: "Please fill in all bank details.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawMethod === "bitcoin" && !bitcoinAddress) {
      toast({
        title: "Invalid input",
        description: "Please enter Bitcoin address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const numericAmount = parseFloat(withdrawAmount);
      
      if (numericAmount > balance) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough funds to withdraw.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('wallet-withdraw', {
        body: {
          user_id: user.id,
          amount: numericAmount,
          method: withdrawMethod,
          account_number: accountNumber,
          bank_code: bankCode,
          bitcoin_address: bitcoinAddress,
        },
      });

      if (error) throw error;

      toast({
        title: "Withdrawal successful!",
        description: `₦${data.net_amount.toFixed(2)} will be sent (Fee: ₦${data.fee.toFixed(2)}).`,
      });
      
      setWithdrawAmount("");
      setAccountNumber("");
      setBankCode("");
      setbitcoinAddress("");
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to process withdrawal. Please try again.",
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
                ₦{balance.toFixed(2)}
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline" 
                  className="bg-muted/50 border-border/50 hover:bg-muted"
                  onClick={() => {
                    const withdrawTab = document.querySelector('[value="withdraw"]');
                    if (withdrawTab) (withdrawTab as HTMLElement).click();
                  }}
                >
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Funds Section */}
          <Tabs defaultValue="add" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <TabsList className="grid grid-cols-3 mb-8 bg-muted/50">
              <TabsTrigger value="add" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Funds
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                History
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
                        onClick={() => setAmount("1000")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        ₦1000
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAmount("5000")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        ₦5000
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAmount("10000")}
                        className="bg-muted/50 border-border/50 hover:bg-muted"
                      >
                        ₦10000
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

            <TabsContent value="withdraw">
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle>Withdraw Funds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="withdraw-amount">Amount (NGN)</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Platform Fee: 20% • You will receive: ₦{withdrawAmount ? (parseFloat(withdrawAmount) * 0.8).toFixed(2) : '0.00'}
                    </p>
                  </div>

                  <div>
                    <Label>Withdrawal Method</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={withdrawMethod === "bank" ? "default" : "outline"}
                        onClick={() => setWithdrawMethod("bank")}
                        className={withdrawMethod === "bank" ? "gradient-primary" : ""}
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Bank
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawMethod === "bitcoin" ? "default" : "outline"}
                        onClick={() => setWithdrawMethod("bitcoin")}
                        className={withdrawMethod === "bitcoin" ? "gradient-primary" : ""}
                      >
                        <Bitcoin className="w-4 h-4 mr-2" />
                        Bitcoin
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawMethod === "paystack" ? "default" : "outline"}
                        onClick={() => setWithdrawMethod("paystack")}
                        className={withdrawMethod === "paystack" ? "gradient-primary" : ""}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Card
                      </Button>
                    </div>
                  </div>
                  
                  {withdrawMethod === "bank" && (
                    <>
                      <div>
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          type="text"
                          placeholder="0123456789"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="bg-muted/50 border-border/50"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="bank-code">Bank Code</Label>
                        <Input
                          id="bank-code"
                          type="text"
                          placeholder="e.g., 058 for GTBank"
                          value={bankCode}
                          onChange={(e) => setBankCode(e.target.value)}
                          className="bg-muted/50 border-border/50"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          <a 
                            href="https://paystack.com/docs/payments/bank-codes" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Find your bank code here
                          </a>
                        </p>
                      </div>
                    </>
                  )}

                  {withdrawMethod === "bitcoin" && (
                    <div>
                      <Label htmlFor="bitcoin-address">Bitcoin Address</Label>
                      <Input
                        id="bitcoin-address"
                        type="text"
                        placeholder="bc1q..."
                        value={bitcoinAddress}
                        onChange={(e) => setbitcoinAddress(e.target.value)}
                        className="bg-muted/50 border-border/50"
                      />
                    </div>
                  )}

                  {withdrawMethod === "paystack" && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Funds will be transferred to your Paystack account
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleWithdraw} 
                    disabled={loading}
                    className="w-full gradient-primary"
                  >
                    {loading ? "Processing..." : "Withdraw Funds"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <ArrowUpRight className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
                      <p className="text-muted-foreground">
                        Your transaction history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${tx.type === 'topup' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              {tx.type === 'topup' ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-500" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold capitalize">{tx.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${tx.type === 'topup' ? 'text-green-500' : 'text-red-500'}`}>
                              {tx.type === 'topup' ? '+' : '-'}₦{Math.abs(tx.amount).toFixed(2)}
                            </div>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
