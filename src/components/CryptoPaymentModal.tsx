import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { recordPurchaseOnChain } from "@/lib/blockchain";
import { supabase } from "@/integrations/supabase/client";

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  price: number;
  creatorWalletAddress?: string;
  onSuccess: () => void;
}

export const CryptoPaymentModal = ({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  price,
  creatorWalletAddress,
  onSuccess
}: CryptoPaymentModalProps) => {
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleCryptoPayment = async () => {
    if (!creatorWalletAddress) {
      toast({
        title: "Creator Wallet Not Available",
        description: "This creator hasn't connected their crypto wallet yet.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use crypto payments");
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get buyer's wallet address
      const { data: buyerData } = await supabase
        .from('creators')
        .select('wallet_address')
        .eq('user_id', user.id)
        .maybeSingle();

      const buyerWalletAddress = buyerData?.wallet_address;

      if (!buyerWalletAddress) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your crypto wallet first in your creator settings.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Generate transaction reference
      const transactionRef = `${contentId}-${user.id}-${Date.now()}`;

      // Create initial transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: price,
          type: 'debit',
          reference: transactionRef,
          status: 'pending',
          description: `Crypto payment for ${contentTitle}`
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Record purchase on blockchain with escrow
      const hash = await recordPurchaseOnChain(
        buyerWalletAddress,
        creatorWalletAddress,
        price,
        contentId,
        transactionRef
      );

      setTxHash(hash);

      // Update transaction with blockchain hash
      await supabase
        .from('transactions')
        .update({ 
          blockchain_hash: hash,
          status: 'completed'
        })
        .eq('id', transactionData.id);

      // Create purchase record
      await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          content_id: contentId,
          amount: price,
          status: 'completed'
        });

      setShowSuccess(true);
      
      toast({
        title: "Payment Successful!",
        description: "Your purchase has been recorded on the blockchain. Funds are held in escrow for 7 days.",
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error("Crypto payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process crypto payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Crypto Payment
              </DialogTitle>
              <DialogDescription>
                Pay with cryptocurrency using MetaMask
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="glass-card p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content:</span>
                  <span className="font-semibold">{contentTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold text-primary">${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold">Crypto (MetaMask)</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-400">
                  💡 <strong>Escrow Protection:</strong> Funds will be held in escrow for 7 days. 
                  This protects both buyer and seller.
                </p>
              </div>

              {!creatorWalletAddress && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ This creator hasn't connected their crypto wallet yet. Crypto payments are unavailable.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCryptoPayment}
                className="flex-1 gradient-primary"
                disabled={processing || !creatorWalletAddress}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Pay with Crypto
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your purchase has been recorded on the blockchain.
            </p>
            {txHash && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`https://polygonscan.com/tx/${txHash}`, '_blank')}
              >
                View on Blockchain
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};