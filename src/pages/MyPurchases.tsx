import { useEffect, useState } from "react";
import { ArrowLeft, Download, Image as ImageIcon, Video, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as unknown as SupabaseClient<any>;

interface Purchase {
  id: string;
  amount: number;
  created_at: string;
  premium_content: {
    id: string;
    title: string;
    description: string;
    type: string;
    url: string;
    thumbnail_url: string;
  };
}

interface Subscription {
  id: string;
  amount_paid: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  creator: {
    display_name: string;
    bio: string;
  };
  plan_name: string;
}

const MyPurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<"purchases" | "subscriptions">("purchases");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchSubscriptions();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
    const { data, error } = await sb
      .from("media_purchases")
      .select(`
        id,
        price_paid,
        created_at,
        media_id,
        media (
          id,
          title,
          description,
          file_url,
          thumbnail_url
        )
      `)
      .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized: Purchase[] = (data || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.price_paid),
        created_at: p.created_at,
        premium_content: {
          id: p.media?.id || p.media_id,
          title: p.media?.title || 'Unknown',
          description: p.media?.description || '',
          type: 'media',
          url: p.media?.file_url || '',
          thumbnail_url: p.media?.thumbnail_url || ''
        },
      }));

      setPurchases(normalized);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Error",
        description: "Failed to load your purchases.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select(`
          id,
          amount_paid,
          created_at,
          expires_at,
          is_active,
          creator_id
        `)
        .eq('subscriber_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator details for each subscription
      const subsWithCreators = await Promise.all(
        (data || []).map(async (sub: any) => {
          const { data: creatorData } = await (supabase as any)
            .from('creators')
            .select('display_name, bio, user_id')
            .eq('id', sub.creator_id)
            .single();

          // Fetch profile for creator
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('display_name')
            .eq('id', creatorData?.user_id)
            .single();

          return {
            ...sub,
            creator: {
              display_name: profileData?.display_name || creatorData?.display_name || 'Unknown Creator',
              bio: creatorData?.bio || ''
            },
            plan_name: 'Premium Subscription'
          };
        })
      );

      setSubscriptions(subsWithCreators);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = title;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading your purchases...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <div>
              <Button
                asChild
                variant="ghost"
                className="hover:bg-muted/50 transition-smooth mb-4"
              >
                <Link to="/explore">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Explore
                </Link>
              </Button>
              <h1 className="text-4xl font-bold">My Purchases</h1>
              <p className="text-muted-foreground mt-2">
                View and access all your premium content
              </p>
            </div>
          </div>

          {/* Content Based on Active Tab */}
          {activeTab === "purchases" && purchases.length === 0 ? (
            <div className="text-center py-12 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring premium content and make your first purchase.
              </p>
              <Button asChild className="gradient-primary">
                <Link to="/explore">Explore Content</Link>
              </Button>
            </div>
          ) : activeTab === "subscriptions" && subscriptions.length === 0 ? (
            <div className="text-center py-12 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
              <p className="text-muted-foreground mb-6">
                Subscribe to your favorite creators to unlock exclusive content
              </p>
              <Button asChild className="gradient-primary">
                <Link to="/explore">Browse Creators</Link>
              </Button>
            </div>
          ) : activeTab === "purchases" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase, index) => (
                <Card
                  key={purchase.id}
                  className="glass-card overflow-hidden hover-scale animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative aspect-video bg-gradient-to-r from-primary/20 to-secondary/20">
                    <img
                      src={purchase.premium_content.thumbnail_url || purchase.premium_content.url}
                      alt={purchase.premium_content.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm flex items-center space-x-1">
                        {purchase.premium_content.type === "video" ? (
                          <Video className="w-3 h-3 text-white" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-white" />
                        )}
                        <span className="text-xs text-white capitalize">
                          {purchase.premium_content.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">
                      {purchase.premium_content.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {purchase.premium_content.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Purchased for ${purchase.amount.toFixed(2)}</span>
                      <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        className="flex-1 gradient-primary"
                      >
                        <Link to={`/premium-gallery/${purchase.premium_content.id}`}>
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleDownload(
                            purchase.premium_content.url,
                            purchase.premium_content.title
                          )
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {subscription.creator.display_name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {subscription.creator.bio || 'Premium subscription access'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={subscription.is_active ? "default" : "secondary"}>
                        {subscription.is_active ? "Active" : "Expired"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-semibold">₦{subscription.amount_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started</span>
                      <span>{new Date(subscription.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {subscription.is_active ? "Expires" : "Expired"}
                      </span>
                      <span>{new Date(subscription.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {subscription.is_active && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        Auto-renews on {new Date(subscription.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPurchases;
