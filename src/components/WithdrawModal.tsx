import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Wallet as WalletIcon, Info } from "lucide-react";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
  onSuccess?: () => void;
}

export const WithdrawModal = ({ open, onOpenChange, maxAmount, onSuccess }: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWithdraw = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amountValue > maxAmount) {
      toast({
        title: "Insufficient Balance",
        description: `Maximum withdrawal amount is ₦${maxAmount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (!recipientCode) {
      toast({
        title: "Missing Information",
        description: "Please provide your Paystack recipient code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('wallet-withdraw', {
        body: { 
          amount: amountValue,
          recipient_code: recipientCode 
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { net_amount, commission } = response.data;

      toast({
        title: "Withdrawal Successful",
        description: `₦${net_amount.toLocaleString()} sent to your account (₦${commission.toLocaleString()} platform fee)`,
      });

      setAmount("");
      setRecipientCode("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const commission = parseFloat(amount) * 0.20 || 0;
  const netAmount = parseFloat(amount) - commission || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Choose your preferred withdrawal method
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Available Balance: <span className="font-bold">₦{maxAmount.toLocaleString()}</span>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="bank" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank">
              <CreditCard className="w-4 h-4 mr-2" />
              Bank Transfer
            </TabsTrigger>
            <TabsTrigger value="crypto">
              <WalletIcon className="w-4 h-4 mr-2" />
              Crypto Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (NGN)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount in Naira"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={maxAmount}
                step="1"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-code">Paystack Recipient Code</Label>
              <Input
                id="recipient-code"
                type="text"
                placeholder="RCP_xxxxxxxxxxxxx"
                value={recipientCode}
                onChange={(e) => setRecipientCode(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Create a transfer recipient in your Paystack dashboard
              </p>
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Withdrawal Amount:</span>
                  <span className="font-medium">₦{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Platform Fee (20%):</span>
                  <span className="font-medium">-₦{commission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold">
                  <span>You Receive:</span>
                  <span className="text-primary">₦{netAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleWithdraw} 
              className="w-full gradient-primary"
              disabled={loading || !amount || !recipientCode}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Withdrawal
            </Button>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 py-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <WalletIcon className="w-5 h-5" />
                Withdraw to Crypto Wallet
              </h3>
              <p className="text-sm text-muted-foreground">
                Withdraw your earnings directly to your connected crypto wallet.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Supported Networks</Label>
              <div className="grid gap-2">
                <div className="p-3 rounded-lg border border-border bg-background flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    Ξ
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Ethereum / Base / Polygon</div>
                    <div className="text-xs text-muted-foreground">Withdraw USDT or USDC</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    ◎
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Solana</div>
                    <div className="text-xs text-muted-foreground">Withdraw USDT or USDC</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <p className="font-medium mb-1 text-amber-600 dark:text-amber-400">Note:</p>
              <p className="text-muted-foreground">
                Crypto withdrawals are processed manually within 24-48 hours. Make sure your wallet address is connected in the Wallet Addresses tab.
              </p>
            </div>

            <Button 
              onClick={() => onOpenChange(false)} 
              className="w-full" 
              variant="outline"
            >
              Contact Support for Crypto Withdrawal
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};