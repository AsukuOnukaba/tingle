import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanSelector } from "./PlanSelector";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

interface SubscriptionModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  onSuccess: () => void;
}

export const SubscriptionModalV2 = ({ 
  isOpen, 
  onClose, 
  creatorId,
  creatorName,
  onSuccess 
}: SubscriptionModalV2Props) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card" | "flutterwave">("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      if (user) {
        fetchWalletBalance();
      }
    }
  }, [isOpen, creatorId, user]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    console.log('🔍 SubscriptionModalV2: Fetching plans for creatorId (user_id):', creatorId);
    
    try {
      // First check if user exists in profiles
      const { data: profileData, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("id", creatorId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        throw profileError;
      }
      
      if (!profileData) {
        console.error("❌ Profile not found for user_id:", creatorId);
        toast.error("Creator profile not found");
        setPlans([]);
        return;
      }

      console.log('✅ Profile found:', profileData);

      // Get creator record
      const { data: creatorData, error: creatorError } = await (supabase as any)
        .from("creators")
        .select("id, user_id, display_name, status")
        .eq("user_id", creatorId)
        .eq("status", "approved")
        .maybeSingle();

      if (creatorError) {
        console.error("❌ Creator fetch error:", creatorError);
        throw creatorError;
      }
      
      if (!creatorData) {
        console.log("❌ No approved creator found for user_id:", creatorId);
        toast.error("This user is not an approved creator yet");
        setPlans([]);
        return;
      }

      console.log('✅ Creator found:', creatorData);

      // Fetch plans using the creator's internal ID
      const { data: plansData, error: plansError } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("creator_id", creatorData.id)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) {
        console.error("❌ Plans fetch error:", plansError);
        throw plansError;
      }

      console.log(`✅ Found ${plansData?.length || 0} plans:`, plansData);

      const formattedPlans = (plansData || []).map((plan: any) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      }));

      setPlans(formattedPlans);
      
      if (formattedPlans.length === 0) {
        toast.error(`${creatorName} hasn't created any subscription plans yet`);
      } else {
        console.log('✅ Plans loaded successfully:', formattedPlans.length);
      }
      
      // Auto-select first plan if available
      if (formattedPlans.length > 0 && !selectedPlan) {
        setSelectedPlan(formattedPlans[0]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching plans:", error);
      toast.error(error.message || "Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

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
    if (!user || !selectedPlan) return;

    if (walletBalance < selectedPlan.price) {
      toast.error("Insufficient wallet balance. Please top up or use card payment.");
      return;
    }

    setLoading(true);
    try {
      // Debit wallet
      const { error: debitError } = await supabase.rpc('debit_wallet', {
        p_user_id: user.id,
        p_amount: selectedPlan.price,
        p_reference: `SUB-${Date.now()}-${user.id.slice(0, 8)}`,
        p_description: `${selectedPlan.name} subscription`
      });

      if (debitError) throw debitError;

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedPlan.duration_days);

      const { error: subError } = await (supabase as any)
        .from('subscriptions')
        .upsert({
          subscriber_id: user.id,
          creator_id: creatorId,
          plan_id: selectedPlan.id,
          amount_paid: selectedPlan.price,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'subscriber_id,creator_id'
        });

      if (subError) throw subError;

      // Credit creator (85% after 15% platform fee)
      const creatorAmount = selectedPlan.price * 0.85;
      await (supabase as any)
        .from('creators')
        .update({
          pending_balance: (supabase as any).raw(`pending_balance + ${creatorAmount}`),
          total_earned: (supabase as any).raw(`total_earned + ${creatorAmount}`)
        })
        .eq('user_id', creatorId);

      toast.success(`Successfully subscribed to ${selectedPlan.name}!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to process subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async (gateway: 'paystack' | 'flutterwave' = 'paystack') => {
    if (!user || !selectedPlan) return;

    setLoading(true);
    try {
      // Get user email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) throw new Error("User email not found");

      const reference = `SUB-${Date.now()}-${user.id.slice(0, 8)}`;
      
      // Create payment intent
      const { error: intentError } = await (supabase as any)
        .from("payment_intents")
        .insert({
          user_id: user.id,
          creator_id: creatorId,
          plan_id: selectedPlan.id,
          amount: selectedPlan.price,
          reference: reference,
          status: "pending",
          gateway: gateway,
        });

      if (intentError) throw intentError;

      if (gateway === 'flutterwave') {
        // Initialize Flutterwave
        const flutterwaveConfig = {
          public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
          tx_ref: reference,
          amount: selectedPlan.price,
          currency: "NGN",
          payment_options: "card,mobilemoney,ussd,banktransfer",
          customer: {
            email: authUser.email,
          },
          meta: {
            plan_id: selectedPlan.id,
            creator_id: creatorId,
            user_id: user.id,
          },
          customizations: {
            title: "Tingle Subscription",
            description: `Subscribe to ${selectedPlan.name}`,
          },
          callback: async (response: any) => {
            if (response.status === "successful") {
              toast.success("Payment successful! Processing subscription...");
              
              const { error: processError } = await supabase.functions.invoke(
                "process-subscription",
                {
                  body: {
                    reference: response.tx_ref,
                    plan_id: selectedPlan.id,
                    creator_id: creatorId,
                  },
                }
              );

              if (processError) {
                toast.error("Failed to activate subscription");
              } else {
                toast.success(`Successfully subscribed to ${selectedPlan.name}!`);
                onSuccess();
                onClose();
              }
            }
            setLoading(false);
          },
          onclose: () => {
            toast.error("Payment cancelled");
            setLoading(false);
          },
        };

        if ((window as any).FlutterwaveCheckout) {
          (window as any).FlutterwaveCheckout(flutterwaveConfig);
        } else {
          toast.error("Flutterwave is not available. Please try Paystack.");
          setLoading(false);
        }
      } else {
        // Initialize Paystack
        const handler = (window as any).PaystackPop?.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: authUser.email,
          amount: selectedPlan.price * 100, // Convert to kobo
          currency: "NGN",
          ref: reference,
          metadata: {
            plan_id: selectedPlan.id,
            creator_id: creatorId,
            user_id: user.id,
          },
          callback: async (response: any) => {
            toast.success("Payment successful! Processing subscription...");
            
            const { error: processError } = await supabase.functions.invoke(
              "process-subscription",
              {
                body: {
                  reference: response.reference,
                  plan_id: selectedPlan.id,
                  creator_id: creatorId,
                },
              }
            );

            if (processError) {
              toast.error("Failed to activate subscription");
            } else {
              toast.success(`Successfully subscribed to ${selectedPlan.name}!`);
              onSuccess();
              onClose();
            }
          },
          onClose: () => {
            toast.error("Payment cancelled");
            setLoading(false);
          },
        });

        if (handler) {
          handler.openIframe();
        } else {
          toast.error("Paystack is not available. Please try again.");
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Card payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (paymentMethod === "wallet") {
      handleWalletPayment();
    } else if (paymentMethod === "flutterwave") {
      handleCardPayment('flutterwave');
    } else {
      handleCardPayment('paystack');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscribe to {creatorName}</DialogTitle>
          <DialogDescription>
            Choose a subscription plan to access exclusive content and features
          </DialogDescription>
        </DialogHeader>

        {loadingPlans ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs value={selectedPlan ? "payment" : "plans"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plans">Select Plan</TabsTrigger>
              <TabsTrigger value="payment" disabled={!selectedPlan}>
                Payment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              <PlanSelector
                plans={plans}
                selectedPlanId={selectedPlan?.id || null}
                onSelectPlan={setSelectedPlan}
                onProceed={() => {
                  // Switch to payment tab
                  const paymentTab = document.querySelector('[value="payment"]') as HTMLElement;
                  paymentTab?.click();
                }}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              {selectedPlan && (
                <>
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Selected Plan</h3>
                    <div className="flex items-center justify-between">
                      <span>{selectedPlan.name}</span>
                      <span className="text-xl font-bold">
                        ₦{selectedPlan.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPlan.duration_days} days access
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <Button
                        type="button"
                        variant={paymentMethod === "wallet" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("wallet")}
                        className="h-auto py-3 sm:py-4"
                      >
                        <div className="flex flex-col items-center gap-1 sm:gap-2">
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-xs sm:text-sm">Wallet</span>
                          <span className="text-[10px] sm:text-xs">₦{walletBalance.toLocaleString()}</span>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === "card" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("card")}
                        className="h-auto py-3 sm:py-4"
                      >
                        <div className="flex flex-col items-center gap-1 sm:gap-2">
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-xs sm:text-sm">Paystack</span>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === "flutterwave" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("flutterwave" as any)}
                        className="h-auto py-3 sm:py-4"
                      >
                        <div className="flex flex-col items-center gap-1 sm:gap-2">
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-xs sm:text-sm">Flutterwave</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {paymentMethod === "wallet" && walletBalance < selectedPlan.price && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      Insufficient balance. Please top up your wallet or use card payment.
                    </div>
                  )}

                  <Button
                    onClick={handleProceed}
                    disabled={
                      loading ||
                      (paymentMethod === "wallet" && walletBalance < selectedPlan.price)
                    }
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Processing..." : `Pay ₦${selectedPlan.price.toLocaleString()}`}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
