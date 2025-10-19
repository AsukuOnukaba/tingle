import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { recordPurchaseOnChain } from "@/lib/blockchain";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

const sb = supabase as unknown as SupabaseClient<any>;

interface BlockchainPurchaseRecorderProps {
  contentId: string;
  creatorWalletAddress: string;
  amount: number;
  onRecorded?: (txHash: string) => void;
}

export const BlockchainPurchaseRecorder = ({
  contentId,
  creatorWalletAddress,
  amount,
  onRecorded
}: BlockchainPurchaseRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const { toast } = useToast();

  const recordOnBlockchain = async () => {
    if (!creatorWalletAddress) {
      toast({
        title: "Creator Wallet Not Connected",
        description: "This creator hasn't connected their blockchain wallet yet",
        variant: "destructive",
      });
      return;
    }

    setRecording(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get buyer's wallet address (you may need to fetch this from creators table)
      const { data: buyerData } = await sb
        .from('creators')
        .select('wallet_address')
        .eq('user_id', user.id)
        .maybeSingle();

      const buyerWalletAddress = buyerData?.wallet_address || user.id; // Fallback to user ID if no wallet

      // Find the transaction for this content purchase
      const { data: transactions } = await sb
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!transactions || transactions.length === 0) {
        throw new Error("Transaction not found");
      }

      const transaction = transactions[0] as any;
      const transactionRef = transaction.reference;

      // Record on blockchain with escrow
      const txHash = await recordPurchaseOnChain(
        buyerWalletAddress,
        creatorWalletAddress,
        amount,
        contentId,
        transactionRef
      );

      // Update transaction in database with blockchain hash
      await sb
        .from('transactions')
        .update({ blockchain_hash: txHash })
        .eq('id', transaction.id);

      toast({
        title: "Blockchain Recording Successful",
        description: `Funds in escrow for 7 days. Transaction: ${txHash.substring(0, 10)}...`,
      });

      onRecorded?.(txHash);
    } catch (error) {
      console.error('Blockchain recording error:', error);
      toast({
        title: "Blockchain Recording Failed",
        description: "Purchase completed but blockchain recording failed. You can still access your content.",
        variant: "destructive",
      });
    } finally {
      setRecording(false);
    }
  };

  if (recording) {
    return (
      <div className="flex items-center justify-center p-4 bg-primary/10 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Recording on blockchain...</span>
      </div>
    );
  }

  return null;
};