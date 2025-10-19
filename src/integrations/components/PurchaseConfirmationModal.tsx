import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ExternalLink, Check, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { recordPurchaseOnChain } from "@/lib/blockchain";
import { CryptoPaymentModal } from "./CryptoPaymentModal";

const sb = supabase as unknown as SupabaseClient<any>;

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  price: number;
  walletBalance: number;
  onPurchaseSuccess: () => void;
  creatorWalletAddress?: string;
}

export const PurchaseConfirmationModal = ({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  price,
  walletBalance,
  onPurchaseSuccess,
  creatorWalletAddress,
}: PurchaseConfirmationModalProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    // Validate inputs
    const purchaseSchema = z.object({
      contentId: z.string().uuid("Invalid content ID"),
      price: z.number().positive("Price must be positive").max(999999.99, "Price exceeds maximum"),
    });

    try {
      purchaseSchema.parse({ contentId, price });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: validationError.errors[0].message,
          variant: "destructive",
        });
      }
      return;
    }

    setIsPurchasing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to purchase content.",
          variant: "destructive",
        });
        return;
      }

      // Use secure purchase function with transaction handling
      const { data, error } = await sb.rpc('process_purchase', {
        p_content_id: contentId,
        p_amount: price
      });

      if (error) {
        if (error.message.includes('already purchased')) {
          toast({
            title: "Already Purchased",
            description: "You have already purchased this content.",
            variant: "destructive",
          });
        } else if (error.message.includes('Insufficient balance')) {
          toast({
            title: "Insufficient Balance",
            description: "You don't have enough credits to purchase this content.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Try to record on blockchain if creator has wallet
      try {
        // Get the transaction that was just created
        const { data: transactions } = await sb
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'debit')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!transactions || transactions.length === 0) {
          throw new Error('Transaction not found');
        }

        const transaction = transactions[0] as any;
        const transactionRef = transaction.reference;

        // Get buyer's wallet address
        const { data: buyerCreatorData } = await sb
          .from('creators')
          .select('wallet_address')
          .eq('user_id', user.id)
          .maybeSingle();

        const buyerWalletAddress = buyerCreatorData?.wallet_address || user.id;

        // Get creator info
        const { data: contentData } = await sb
          .from('premium_content')
          .select('creator_id')
          .eq('id', contentId)
          .maybeSingle();

        if (contentData) {
          const { data: creatorData } = await sb
            .from('creators')
            .select('wallet_address')
            .eq('user_id', (contentData as any).creator_id)
            .maybeSingle();

          if (creatorData && (creatorData as any).wallet_address) {
            // Record on blockchain with escrow
            const txHash = await recordPurchaseOnChain(
              buyerWalletAddress,
              (creatorData as any).wallet_address,
              price,
              contentId,
              transactionRef
            );

            setBlockchainHash(txHash);

            // Update transaction with blockchain hash
            await sb
              .from('transactions')
              .update({ blockchain_hash: txHash })
              .eq('id', transaction.id);
          }
        }
      } catch (blockchainError) {
        console.error('Blockchain recording error:', blockchainError);
        // Don't fail the purchase if blockchain recording fails
      }

      setShowSuccess(true);

      toast({
        title: "Purchase Successful",
        description: `You have successfully purchased "${contentTitle}"`,
      });

      // Wait a bit to show success state before closing
      setTimeout(() => {
        onPurchaseSuccess();
        onClose();
        setShowSuccess(false);
        setBlockchainHash(null);
      }, blockchainHash ? 3000 : 1500);
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "An error occurred while processing your purchase.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const hasInsufficientBalance = walletBalance < price;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !isPurchasing && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showSuccess ? "Purchase Successful!" : "Confirm Purchase"}
          </DialogTitle>
          <DialogDescription>
            {showSuccess 
              ? "Your purchase has been completed successfully."
              : "Review your purchase details before confirming."
            }
          </DialogDescription>
        </DialogHeader>
        
        {showSuccess ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center p-4 bg-green-500/10 rounded-lg">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You can now access "{contentTitle}"
              </p>
              {blockchainHash && (
                <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Blockchain Transaction
                  </p>
                  <p className="font-mono text-xs break-all">
                    {blockchainHash}
                  </p>
                  <a
                    href={`https://mumbai.polygonscan.com/tx/${blockchainHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View on Blockchain
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Content:</span>
              <span className="font-medium">{contentTitle}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium text-primary">${price.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-medium">${walletBalance.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">Balance After Purchase:</span>
              <span className={`font-medium ${hasInsufficientBalance ? 'text-destructive' : ''}`}>
                ${Math.max(0, walletBalance - price).toFixed(2)}
              </span>
            </div>

            {hasInsufficientBalance && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">Insufficient balance to complete this purchase.</p>
              </div>
            )}
          </div>
        )}

        {!showSuccess && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPurchasing} className="w-full sm:w-auto">
              Cancel
            </Button>
            <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || hasInsufficientBalance}
                className="gradient-primary flex-1"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay with Wallet"
                )}
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  setShowCryptoModal(true);
                }}
                disabled={isPurchasing}
                className="bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90 flex-1"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Pay with Crypto
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Crypto Payment Modal */}
    <CryptoPaymentModal
      isOpen={showCryptoModal}
      onClose={() => setShowCryptoModal(false)}
      contentId={contentId}
      contentTitle={contentTitle}
      price={price}
      creatorWalletAddress={creatorWalletAddress}
      onSuccess={onPurchaseSuccess}
    />
  </>
  );
};
