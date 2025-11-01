import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CreditCard, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Subscription {
  id: string;
  creator_id: string;
  plan_id: string;
  amount_paid: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  creator: {
    display_name: string;
    profile_image: string;
  };
}

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select(`
          *,
          creator:profiles!subscriptions_creator_id_fkey(
            display_name,
            profile_image
          )
        `)
        .eq("subscriber_id", user?.id);

      if (error) throw error;
      setSubscriptions((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading subscriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions" as any)
        .update({ is_active: false })
        .eq("id", subscriptionId);

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully",
      });

      fetchSubscriptions();
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>

        {loading ? (
          <div className="text-center py-12">Loading your subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
              <p className="text-muted-foreground text-center mb-4">
                You don't have any active subscriptions yet
              </p>
              <Button onClick={() => window.location.href = "/explore"}>
                Explore Creators
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={subscription.creator.profile_image}
                        alt={subscription.creator.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <CardTitle>{subscription.creator.display_name}</CardTitle>
                        <CardDescription>
                          {subscription.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Cancelled</Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold">₦{subscription.amount_paid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Started</p>
                        <p className="font-semibold">
                          {format(new Date(subscription.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p className="font-semibold">
                          {subscription.expires_at
                            ? format(new Date(subscription.expires_at), "MMM dd, yyyy")
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {subscription.is_active && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelSubscription(subscription.id)}
                      >
                        Cancel Subscription
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
