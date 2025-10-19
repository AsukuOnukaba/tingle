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
        description: `Maximum withdrawal amount is $${maxAmount.toFixed(2)}`,
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
        description: `$${net_amount.toFixed(2)} sent to your account ($${commission.toFixed(2)} platform fee)`,
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
            Available Balance: <span className="font-bold">${maxAmount.toFixed(2)}</span>
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
              <Label htmlFor="withdraw-amount">Amount (USD)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={maxAmount}
                step="0.01"
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
                  <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Platform Fee (20%):</span>
                  <span className="font-medium">-${commission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold">
                  <span>You Receive:</span>
                  <span className="text-primary">${netAmount.toFixed(2)}</span>
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
            <div className="space-y-2">
              <Label htmlFor="crypto-withdraw-amount">Amount (USD)</Label>
              <Input
                id="crypto-withdraw-amount"
                type="number"
                placeholder="Enter amount"
                min="0"
                step="0.01"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                type="text"
                placeholder="Enter your crypto wallet address"
                disabled
              />
            </div>

            <div className="space-y-3">
              <Label>Select Cryptocurrency</Label>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled
                >
                  <div className="w-5 h-5 mr-3 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    ₿
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Bitcoin (BTC)</div>
                    <div className="text-xs text-muted-foreground">Coming Soon</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled
                >
                  <div className="w-5 h-5 mr-3 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    Ξ
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Ethereum (ETH)</div>
                    <div className="text-xs text-muted-foreground">Coming Soon</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled
                >
                  <div className="w-5 h-5 mr-3 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                    ₮
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Tether (USDT)</div>
                    <div className="text-xs text-muted-foreground">Coming Soon</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm text-center text-muted-foreground">
              Cryptocurrency withdrawals will be available soon. Stay tuned!
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};