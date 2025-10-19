import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  releaseFundsFromEscrow, 
  raiseDispute, 
  EscrowStatus, 
  getCreatorWithdrawableBalance,
  getCreatorTotalEarnings,
  withdrawCreatorEarnings 
} from "@/lib/blockchain";
import { Clock, AlertTriangle, CheckCircle, XCircle, Loader2, Wallet } from "lucide-react";
import { formatEther } from "ethers";

interface EscrowTransaction {
  transactionRef: string;
  contentId: string;
  amount: number;
  creatorName: string;
  timestamp: Date;
  releaseTime: Date;
  status: EscrowStatus;
  blockchainHash?: string;
}

interface EscrowManagerProps {
  creatorAddress: string;
  transactions?: EscrowTransaction[];
  onRefresh?: () => void;
}

export const EscrowManager = ({ creatorAddress, transactions = [], onRefresh }: EscrowManagerProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [withdrawableBalance, setWithdrawableBalance] = useState<bigint>(BigInt(0));
  const [totalEarnings, setTotalEarnings] = useState<bigint>(BigInt(0));
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBalances();
  }, [creatorAddress]);

  const fetchBalances = async () => {
    if (!creatorAddress) return;
    
    setBalanceLoading(true);
    try {
      const [withdrawable, total] = await Promise.all([
        getCreatorWithdrawableBalance(creatorAddress),
        getCreatorTotalEarnings(creatorAddress)
      ]);
      setWithdrawableBalance(withdrawable);
      setTotalEarnings(total);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading("withdraw");
    try {
      const txHash = await withdrawCreatorEarnings();
      
      toast({
        title: "Withdrawal Successful",
        description: `Blockchain earnings withdrawn. Tx: ${txHash.substring(0, 10)}...`,
      });
      
      await fetchBalances();
      onRefresh?.();
    } catch (error) {
      console.error("Error withdrawing:", error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to withdraw earnings",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: EscrowStatus) => {
    switch (status) {
      case EscrowStatus.Pending:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" />
          In Escrow
        </Badge>;
      case EscrowStatus.Released:
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Released
        </Badge>;
      case EscrowStatus.Disputed:
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Disputed
        </Badge>;
      case EscrowStatus.Refunded:
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          Refunded
        </Badge>;
    }
  };

  const handleReleaseFunds = async (transactionRef: string) => {
    setLoading(transactionRef);
    try {
      const txHash = await releaseFundsFromEscrow(transactionRef);
      
      toast({
        title: "Funds Released",
        description: `Funds released from escrow. Tx: ${txHash.substring(0, 10)}...`,
      });
      
      onRefresh?.();
    } catch (error) {
      console.error("Error releasing funds:", error);
      toast({
        title: "Release Failed",
        description: error instanceof Error ? error.message : "Failed to release funds",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRaiseDispute = async (transactionRef: string) => {
    setLoading(transactionRef);
    try {
      const txHash = await raiseDispute(transactionRef);
      
      toast({
        title: "Dispute Raised",
        description: `Dispute raised successfully. Support will review. Tx: ${txHash.substring(0, 10)}...`,
      });
      
      onRefresh?.();
    } catch (error) {
      console.error("Error raising dispute:", error);
      toast({
        title: "Dispute Failed",
        description: error instanceof Error ? error.message : "Failed to raise dispute",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const canRelease = (transaction: EscrowTransaction) => {
    return transaction.status === EscrowStatus.Pending && 
           new Date() >= transaction.releaseTime;
  };

  const canDispute = (transaction: EscrowTransaction) => {
    return transaction.status === EscrowStatus.Pending && 
           new Date() < transaction.releaseTime;
  };

  return (
    <>
      {/* Blockchain Earnings Card */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Blockchain Earnings
          </CardTitle>
          <CardDescription>
            Your earnings from blockchain-recorded transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available to Withdraw</p>
                <p className="text-2xl font-bold">
                  {balanceLoading ? "..." : `${parseFloat(formatEther(withdrawableBalance)).toFixed(4)} ETH`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                <p className="text-2xl font-bold">
                  {balanceLoading ? "..." : `${parseFloat(formatEther(totalEarnings)).toFixed(4)} ETH`}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWithdraw}
              disabled={loading === "withdraw" || withdrawableBalance === BigInt(0)}
              className="w-full"
            >
              {loading === "withdraw" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Withdraw Blockchain Earnings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Transactions */}
      {transactions.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Escrow Protection</CardTitle>
            <CardDescription>
              Funds are held in escrow for 7 days to ensure quality and satisfaction
            </CardDescription>
          </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.transactionRef}
            className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{transaction.creatorName}</p>
                  {getStatusBadge(transaction.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Content ID: {transaction.contentId.substring(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Release: {transaction.releaseTime.toLocaleDateString()} at{" "}
                  {transaction.releaseTime.toLocaleTimeString()}
                </p>
              </div>
              <p className="text-lg font-bold">${transaction.amount.toFixed(2)}</p>
            </div>

            {transaction.blockchainHash && (
              <a
                href={`https://mumbai.polygonscan.com/tx/${transaction.blockchainHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline block mb-3"
              >
                View on Blockchain ↗
              </a>
            )}

            <div className="flex gap-2">
              {canRelease(transaction) && (
                <Button
                  onClick={() => handleReleaseFunds(transaction.transactionRef)}
                  disabled={loading === transaction.transactionRef}
                  size="sm"
                  className="flex-1"
                >
                  {loading === transaction.transactionRef && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Release Funds
                </Button>
              )}
              
              {canDispute(transaction) && (
                <Button
                  onClick={() => handleRaiseDispute(transaction.transactionRef)}
                  disabled={loading === transaction.transactionRef}
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                >
                  {loading === transaction.transactionRef && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Raise Dispute
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
      )}
    </>
  );
};
