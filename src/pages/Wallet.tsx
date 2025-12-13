import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { TopUpModal } from "@/components/TopUpModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { WalletAddressManager } from "@/components/wallet/WalletAddressManager";
import { EscrowManager } from "@/components/EscrowManager";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard,
  Coins,
  TrendingUp,
  History
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  chain: string | null;
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
      const [fiatTxns, blockchainTxns] = await Promise.all([
        sb.from("transactions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(50),
        sb.from("blockchain_transactions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      const allTransactions = [
        ...(fiatTxns.data || []).map(tx => ({
          ...tx,
          blockchain_hash: null,
          chain: null,
        })),
        ...(blockchainTxns.data || []).map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.direction === 'deposit' ? 'credit' : 'debit',
          reference: tx.tx_hash,
          status: tx.status,
          description: `${tx.chain.toUpperCase()} ${tx.direction}`,
          blockchain_hash: tx.tx_hash,
          chain: tx.chain,
          created_at: tx.created_at,
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
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

  const getExplorerUrl = (chain: string, hash: string) => {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      base: 'https://basescan.org/tx/',
      polygon: 'https://polygonscan.com/tx/',
      bnb: 'https://bscscan.com/tx/',
      solana: 'https://solscan.io/tx/',
    };
    return `${explorers[chain] || 'https://etherscan.io/tx/'}${hash}`;
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <WalletIcon className="w-8 h-8 text-primary" />
              My Wallet
            </h1>
            <p className="text-muted-foreground">
              Manage your balance, deposits, and blockchain addresses
            </p>
          </div>

          {/* Balance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Balance Card */}
            <Card className="lg:col-span-2 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Wallet Balance
                </CardTitle>
                <CardDescription>Your available funds in Nigerian Naira</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-4xl md:text-5xl font-bold tracking-tight">
                      ₦{wallet?.balance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => setTopUpOpen(true)} 
                      size="lg"
                      className="w-full h-14 text-lg"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Top Up
                    </Button>
                    <Button 
                      onClick={() => setWithdrawOpen(true)} 
                      variant="default"
                      className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
                      size="lg"
                      disabled={(wallet?.balance || 0) <= 0}
                    >
                      <Minus className="w-5 h-5 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₦{transactions
                      .filter(t => t.type === 'credit')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₦{transactions
                      .filter(t => t.type === 'debit')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {transactions.length} total transactions
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="addresses" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Blockchain Addresses Tab */}
            <TabsContent value="addresses" className="space-y-6">
              <WalletAddressManager />
              
              {/* Escrow for creators */}
              {isCreator && creatorWalletAddress && (
                <EscrowManager creatorAddress={creatorWalletAddress} />
              )}
            </TabsContent>

            {/* Deposit Methods Tab */}
            <TabsContent value="deposit" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>Choose how you want to add funds to your wallet</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card Payment */}
                    <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setTopUpOpen(true)}>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Card Payment</h3>
                          <p className="text-sm text-muted-foreground">Paystack • Instant</p>
                        </div>
                      </div>
                      <Button className="w-full" size="lg">
                        Top Up with Card
                      </Button>
                    </div>

                    {/* Crypto Deposit */}
                    <div className="p-5 rounded-xl border-2 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                          ◎
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Crypto Deposit</h3>
                          <p className="text-sm text-muted-foreground">ETH, SOL, USDT • Auto-detected</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Send crypto to your connected wallet address. Balance updates automatically.
                      </p>
                      <Button className="w-full" size="lg" variant="outline" onClick={() => {
                        const addressTab = document.querySelector('[value="addresses"]') as HTMLElement;
                        addressTab?.click();
                      }}>
                        View Deposit Addresses
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transaction History Tab */}
            <TabsContent value="history">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>All your deposits, withdrawals, and transfers</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No transactions yet</p>
                      <Button onClick={() => setTopUpOpen(true)} className="mt-4">
                        Make your first deposit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${
                              transaction.type === 'credit' 
                                ? 'bg-green-500/10 text-green-500' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {transaction.type === 'credit' ? (
                                <ArrowDownRight className="w-5 h-5" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {transaction.description || (transaction.type === 'credit' ? 'Deposit' : 'Withdrawal')}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(transaction.created_at).toLocaleDateString('en-NG', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <Badge variant={transaction.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                                  {transaction.status}
                                </Badge>
                                {transaction.chain && (
                                  <Badge variant="secondary" className="text-xs uppercase">
                                    {transaction.chain}
                                  </Badge>
                                )}
                              </div>
                              {transaction.blockchain_hash && transaction.chain && (
                                <a
                                  href={getExplorerUrl(transaction.chain, transaction.blockchain_hash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                                >
                                  View on Explorer ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <p className={`text-xl font-bold ${
                            transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            ₦{transaction.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </p>
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
