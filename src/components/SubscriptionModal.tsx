import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Calendar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Array<{
    id: string;
    name: string;
    price: number;
    duration_days: number;
    description?: string;
    features?: string[];
  }>;
  creatorId: string;
  creatorName: string;
  onSuccess: () => void;
}

export const SubscriptionModal = ({ 
  isOpen, 
  onClose, 
  plans, 
  creatorId,
  creatorName,
  onSuccess 
}: SubscriptionModalProps) => {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Set first plan as default when modal opens
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const basePrice = selectedPlan?.price || 0;
  const planDuration = selectedPlan?.duration_days || 30;
  const annualDiscount = 0.15; // 15% discount for annual
  const monthlyPrice = basePrice;
  const annualPrice = basePrice * 12 * (1 - annualDiscount);
  const savings = basePrice * 12 - annualPrice;

  const selectedPrice = billingCycle === "monthly" ? monthlyPrice : annualPrice;
  const durationDays = billingCycle === "monthly" ? planDuration : 365;

  useEffect(() => {
    if (isOpen && user) {
      fetchWalletBalance();
    }
  }, [isOpen, user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setWalletBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const handleWalletPayment = async () => {
    if (!user) return;

    if (walletBalance < selectedPrice) {
      toast.error("Insufficient wallet balance. Please top up or use card payment.");
      return;
    }

    setLoading(true);
    try {
      // Debit wallet
      const { data: debitResult, error: debitError } = await supabase.rpc('debit_wallet', {
        p_user_id: user.id,
        p_amount: selectedPrice,
        p_reference: `SUB-${Date.now()}-${user.id.slice(0, 8)}`,
        p_description: `${selectedPlan?.name || 'subscription'} subscription - ${billingCycle}`
      });

      if (debitError) throw debitError;

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const { error: subError } = await (supabase as any)
        .from('subscriptions')
        .upsert({
          subscriber_id: user.id,
          creator_id: creatorId,
          plan_id: selectedPlanId,
          amount_paid: selectedPrice,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'subscriber_id,creator_id'
        });

      if (subError) throw subError;

      toast.success(`Successfully subscribed to ${selectedPlan?.name}!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to process subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!user || !user.email) return;

    setLoading(true);
    try {
      const reference = `SUB-${Date.now()}-${user.id.slice(0, 8)}`;

      // Create payment intent (no need to store plan_id since we're using creator_id)
      const { error: intentError } = await (supabase as any)
        .from("payment_intents")
        .insert({
          user_id: user.id,
          creator_id: creatorId,
          amount: selectedPrice,
          reference,
          status: "pending",
          metadata: {
            plan_name: selectedPlan?.name,
            billing_cycle: billingCycle,
            duration_days: durationDays,
          },
        });

      if (intentError) throw intentError;

      // Initialize Paystack
      const handler = (window as any).PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_dummy",
        email: user.email,
        amount: selectedPrice * 100, // Convert to kobo
        currency: "NGN",
        ref: reference,
        callback: async (response: any) => {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          const { error: subError } = await (supabase as any)
            .from('subscriptions')
            .upsert({
              subscriber_id: user.id,
              creator_id: creatorId,
              plan_id: selectedPlanId,
              amount_paid: selectedPrice,
              is_active: true,
              expires_at: expiresAt.toISOString(),
            }, {
              onConflict: 'subscriber_id,creator_id'
            });

          if (subError) {
            toast.error("Payment successful but subscription failed. Please contact support.");
          } else {
            toast.success(`Successfully subscribed to ${selectedPlan?.name}!`);
            onSuccess();
            onClose();
          }
        },
        onClose: () => {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (paymentMethod === "wallet") {
      handleWalletPayment();
    } else {
      handleCardPayment();
    }
  };

  if (plans.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Subscription Plans Available</DialogTitle>
            <DialogDescription>
              This creator hasn't created any subscription plans yet. Please check back later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] glass-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Subscribe to {creatorName}</DialogTitle>
          <DialogDescription>
            Choose your plan, billing cycle, and payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select a Plan</Label>
            <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="relative">
                    <RadioGroupItem
                      value={plan.id}
                      id={plan.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={plan.id}
                      className="flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">{plan.name}</span>
                        <Badge variant="secondary">₦{plan.price.toLocaleString()}/month</Badge>
                      </div>
                      {plan.description && (
                        <span className="text-sm text-muted-foreground">{plan.description}</span>
                      )}
                      {plan.features && plan.features.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-2">
                              <span className="text-primary">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Billing Cycle Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Billing Cycle
            </Label>
            <RadioGroup value={billingCycle} onValueChange={(value: any) => setBillingCycle(value)}>
              <div className="flex items-center space-x-3 glass-card p-4 rounded-xl hover:border-primary transition-smooth cursor-pointer">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Monthly</p>
                      <p className="text-sm text-muted-foreground">Billed every month</p>
                    </div>
                    <p className="text-lg font-bold">₦{monthlyPrice.toLocaleString()}/mo</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 glass-card p-4 rounded-xl hover:border-primary transition-smooth cursor-pointer relative">
                <RadioGroupItem value="annual" id="annual" />
                <Label htmlFor="annual" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold flex items-center">
                        Annual
                        <Badge className="ml-2 gradient-primary text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Save ₦{savings.toLocaleString()}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">Billed annually</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₦{annualPrice.toLocaleString()}/yr</p>
                      <p className="text-xs text-muted-foreground">
                        ₦{(annualPrice / 12).toFixed(0)}/mo
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <Tabs value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wallet" className="flex items-center">
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="card" className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </TabsTrigger>
              </TabsList>
              <TabsContent value="wallet" className="space-y-3 mt-4">
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                  <p className="text-2xl font-bold">₦{walletBalance.toLocaleString()}</p>
                  {walletBalance < selectedPrice && (
                    <p className="text-sm text-destructive mt-2">
                      Insufficient balance. Need ₦{(selectedPrice - walletBalance).toLocaleString()} more.
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="card" className="mt-4">
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    Pay securely with your card via Paystack
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Summary */}
          <div className="glass-card p-4 rounded-xl space-y-2 bg-primary/5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold">{selectedPlan?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billing</span>
              <span className="font-semibold capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold">{durationDays} days</span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  ₦{selectedPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubscribe}
            className="flex-1 gradient-primary neon-glow"
            disabled={loading || (paymentMethod === "wallet" && walletBalance < selectedPrice)}
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
