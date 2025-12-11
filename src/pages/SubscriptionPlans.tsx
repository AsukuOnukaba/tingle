import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Crown, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[];
}

interface Creator {
  id: string;
  display_name: string;
  bio: string;
}

const SubscriptionPlans = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchPlansAndCreator();
  }, [user, creatorId]);

  const fetchPlansAndCreator = async () => {
    try {
      setLoading(true);

      // Fetch creator details
      const { data: creatorData, error: creatorError } = await (supabase as any)
        .from("creators")
        .select("id, display_name, bio")
        .eq("id", creatorId)
        .single();

      if (creatorError) throw creatorError;
      setCreator(creatorData);

      // Fetch subscription plans
      const { data: plansData, error: plansError } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      // First, look up the actual creator record ID from the creators table
      // The creatorId from URL is the user's profile ID, not the creator's table ID
      const { data: creatorRecord, error: creatorLookupError } = await (supabase as any)
        .from('creators')
        .select('id')
        .eq('user_id', creatorId)
        .eq('status', 'approved')
        .single();

      if (creatorLookupError || !creatorRecord) {
        throw new Error('Creator not found or not approved');
      }

      const actualCreatorId = creatorRecord.id;

      // Create payment intent with the correct creator table ID
      const reference = `SUB-${Date.now()}-${user.id.slice(0, 8)}`;
      
      const { error: intentError } = await (supabase as any)
        .from("payment_intents")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          creator_id: actualCreatorId, // Use the actual creator table ID
          amount: plan.price,
          reference,
          status: "pending",
          metadata: {
            plan_name: plan.name,
            duration_days: plan.duration_days,
          },
        });

      if (intentError) throw intentError;

      // Initialize Paystack
      const handler = (window as any).PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_dummy",
        email: user.email,
        amount: plan.price * 100, // Convert to kobo
        currency: "NGN",
        ref: reference,
        callback: async (response: any) => {
          // Process subscription
          const { error: subError } = await supabase.functions.invoke("process-subscription", {
            body: {
              reference: response.reference,
              plan_id: plan.id,
              creator_id: creatorId,
            },
          });

          if (subError) {
            toast({
              title: "Subscription Error",
              description: "Payment successful but subscription failed. Please contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Subscription Successful!",
              description: `You're now subscribed to ${plan.name}`,
            });
            navigate(`/profile/${creatorId}`);
          }
        },
        onClose: () => {
          setProcessingPlanId(null);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process subscription",
        variant: "destructive",
      });
      setProcessingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-up">
            <Badge className="mb-4 gradient-primary neon-glow">
              <Crown className="w-3 h-3 mr-1" />
              Premium Access
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Subscribe to{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {creator?.display_name}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {creator?.bio || "Choose a plan and get exclusive access to premium content"}
            </p>
          </div>

          {/* Plans Grid */}
          {plans.length === 0 ? (
            <Card className="glass-card max-w-md mx-auto animate-fade-up">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Plans Available</h3>
                <p className="text-muted-foreground text-center">
                  This creator hasn't set up any subscription plans yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className={`glass-card hover-scale transition-smooth animate-fade-up ${
                    index === 1 ? "border-primary neon-glow" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    {index === 1 && (
                      <Badge className="mb-2 w-fit gradient-primary">
                        Most Popular
                      </Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        ₦{plan.price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.duration_days} days
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full gradient-primary hover:opacity-90 transition-smooth neon-glow"
                      onClick={() => handleSubscribe(plan)}
                      disabled={processingPlanId === plan.id}
                    >
                      {processingPlanId === plan.id
                        ? "Processing..."
                        : "Subscribe Now"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Benefits Section */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              What You'll Get
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Crown,
                  title: "Exclusive Content",
                  description: "Access premium photos and videos",
                },
                {
                  icon: Sparkles,
                  title: "Direct Messaging",
                  description: "Chat directly with the creator",
                },
                {
                  icon: Check,
                  title: "Priority Support",
                  description: "Get faster responses and support",
                },
              ].map((benefit, i) => (
                <Card
                  key={i}
                  className="glass-card text-center animate-fade-up"
                  style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                >
                  <CardContent className="pt-6">
                    <benefit.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
