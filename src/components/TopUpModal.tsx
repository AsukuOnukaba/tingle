import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Bitcoin } from "lucide-react";

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export const TopUpModal = ({ open, onOpenChange, onSuccess }: TopUpModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const { toast } = useToast();

  const handleTopUp = async () => {
    const amountValue = parseFloat(amount);

    if (!amountValue || amountValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error("User email not found");
      }

      const reference = `TOP-${Date.now()}-${user.id.substring(0, 8)}`;

      // Initialize payment via edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const initResponse = await supabase.functions.invoke("initiate-payment", {
        body: { 
          amount: amountValue,
          gateway: selectedGateway 
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message || 'Failed to initialize payment');
      }

      const { payment_url, reference: paymentRef } = initResponse.data;

      // Open payment URL in new window
      const paymentWindow = window.open(payment_url, '_blank', 'width=600,height=700');
      
      if (!paymentWindow) {
        throw new Error('Please allow popups to complete payment');
      }

      // Poll for payment completion
      toast({
        title: "Payment Gateway Opened",
        description: "Complete your payment in the new window",
      });

      const pollInterval = setInterval(async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          const verifyResponse = await supabase.functions.invoke("wallet-topup", {
            body: { reference: paymentRef },
            headers: {
              Authorization: `Bearer ${currentSession?.access_token}`,
            },
          });

          if (!verifyResponse.error) {
            clearInterval(pollInterval);
            setLoading(false);
            
            toast({
              title: "Top-up Successful",
              description: `Your wallet has been credited with ₦${amountValue.toLocaleString()}`,
            });

            setAmount("");
            onOpenChange(false);
            onSuccess?.();
          }
        } catch (error) {
          // Payment not yet completed, continue polling
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setLoading(false);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Top-up error:', error);
      toast({
        title: "Top-up Failed",
        description: error.message || "Failed to process top-up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card">
              <CreditCard className="w-4 h-4 mr-2" />
              Card
            </TabsTrigger>
            <TabsTrigger value="crypto">
              <Bitcoin className="w-4 h-4 mr-2" />
              Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount in Naira"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="1"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum: ₦500
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Gateway</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedGateway === 'paystack' ? 'default' : 'outline'}
                  onClick={() => setSelectedGateway('paystack')}
                  disabled={loading}
                  className="w-full"
                >
                  Paystack
                </Button>
                <Button
                  type="button"
                  variant={selectedGateway === 'flutterwave' ? 'default' : 'outline'}
                  onClick={() => setSelectedGateway('flutterwave')}
                  disabled={loading}
                  className="w-full"
                >
                  Flutterwave
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Both gateways support cards, bank transfer, and USSD
              </p>
            </div>

            <Button
              onClick={handleTopUp}
              className="w-full gradient-primary"
              disabled={loading || !amount || parseFloat(amount) < 500}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Payment
            </Button>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="crypto-amount">Amount (USD)</Label>
              <Input
                id="crypto-amount"
                type="number"
                placeholder="Enter amount"
                min="0"
                step="0.01"
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
                  <Bitcoin className="w-5 h-5 mr-3 text-orange-500" />
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
                    E
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
              Cryptocurrency payments will be available soon. Stay tuned!
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};