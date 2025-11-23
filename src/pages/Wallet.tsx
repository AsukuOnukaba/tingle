import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { TopUpModal } from "@/components/TopUpModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { WalletConnect } from "@/components/WalletConnect";
import { EscrowManager } from "@/components/EscrowManager";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, Plus, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

const sb = supabase as unknown as SupabaseClient<any>;

interface WalletData {
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  reference: string;
  status: string;
  description: string;
  blockchain_hash: string | null;
  created_at: string;
}

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const { isCreator } = useRoles();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creatorWalletAddress, setCreatorWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchTransactions();
      if (isCreator) {
        fetchCreatorWalletAddress();
      }
    }
  }, [user, isCreator]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await sb
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data ? { balance: data.balance, currency: 'NGN' } : null);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await sb
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchCreatorWalletAddress = async () => {
    try {
      const { data, error } = await sb
        .from("creators")
        .select("wallet_address")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setCreatorWalletAddress(data ? (data as any).wallet_address || null : null);
    } catch (error) {
      console.error("Error fetching creator wallet address:", error);
    }
  };

  const handleTopUpSuccess = () => {
    fetchWalletData();
    fetchTransactions();
  };

  const handleWithdrawSuccess = () => {
    fetchWalletData();
    fetchTransactions();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">My Wallet</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your balance and transactions
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Wallet Balance Card */}
            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <WalletIcon className="w-5 h-5" />
                  <span>Wallet Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-3xl md:text-4xl font-bold">
                      ₦{wallet?.balance.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => setTopUpOpen(true)} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Top Up
                    </Button>
                    {isCreator && (
                      <Button 
                        onClick={() => setWithdrawOpen(true)} 
                        variant="outline"
                        className="flex-1"
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MetaMask Connection (Creators Only) */}
            {isCreator && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Blockchain Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <WalletConnect 
                    currentWalletAddress={creatorWalletAddress || undefined}
                    onConnect={(address) => setCreatorWalletAddress(address)}
                  />
                  <p className="text-xs text-muted-foreground mt-3">
                    Connect your crypto wallet for blockchain transaction transparency
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Methods */}
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card Payment */}
                <div className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Card Payment</h3>
                      <p className="text-xs text-muted-foreground">Paystack - Instant</p>
                    </div>
                  </div>
                  <Button onClick={() => setTopUpOpen(true)} className="w-full" size="sm">
                    Top Up with Card
                  </Button>
                </div>

                {/* Bitcoin */}
                <div className="p-4 rounded-lg border border-border bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                      ₿
                    </div>
                    <div>
                      <h3 className="font-semibold">Bitcoin (BTC)</h3>
                      <p className="text-xs text-muted-foreground">Coming Soon</p>
                    </div>
                  </div>
                  <Button disabled className="w-full" size="sm" variant="outline">
                    Coming Soon
                  </Button>
                </div>

                {/* Ethereum */}
                <div className="p-4 rounded-lg border border-border bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      Ξ
                    </div>
                    <div>
                      <h3 className="font-semibold">Ethereum (ETH)</h3>
                      <p className="text-xs text-muted-foreground">Coming Soon</p>
                    </div>
                  </div>
                  <Button disabled className="w-full" size="sm" variant="outline">
                    Coming Soon
                  </Button>
                </div>

                {/* USDT */}
                <div className="p-4 rounded-lg border border-border bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                      ₮
                    </div>
                    <div>
                      <h3 className="font-semibold">Tether (USDT)</h3>
                      <p className="text-xs text-muted-foreground">Coming Soon</p>
                    </div>
                  </div>
                  <Button disabled className="w-full" size="sm" variant="outline">
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Earnings & Escrow */}
          {isCreator && creatorWalletAddress && (
            <div className="mb-8">
              <EscrowManager creatorAddress={creatorWalletAddress} />
            </div>
          )}

          {/* Transactions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'credit' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.description || transaction.type}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.status}
                            </Badge>
                          </div>
                          {transaction.blockchain_hash && (
                            <a
                              href={`https://mumbai.polygonscan.com/tx/${transaction.blockchain_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 block"
                            >
                              View on Blockchain ↗
                            </a>
                          )}
                        </div>
                      </div>
                       <p className={`text-lg font-bold ${
                        transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                         {transaction.type === 'credit' ? '+' : '-'}
                         ₦{transaction.amount.toFixed(2)}
                       </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TopUpModal 
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        onSuccess={handleTopUpSuccess}
      />

      {isCreator && (
        <WithdrawModal
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          maxAmount={wallet?.balance || 0}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
};

export default Wallet;