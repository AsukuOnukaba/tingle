import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Star, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

const sb = supabase as unknown as SupabaseClient<any>;

const PremiumChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  useEffect(() => {
    const initializeChat = async () => {
      if (authLoading) return;
      
      if (!user) {
        toast.error("Please login to access premium chat");
        navigate("/login");
        return;
      }

      if (!id) return;

      await fetchCreatorProfile();
      await checkAccess();
    };
    
    initializeChat();
  }, [user, id, authLoading]);

  const fetchCreatorProfile = async () => {
    if (!id) return;
    
    try {
      const { data: profileData, error: profileError } = await sb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!profileError && profileData) {
        setCreatorProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching creator profile:", error);
    }
  };

  const checkAccess = async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has active subscription entitlement for premium chat
      const { data: entitlements, error: entError } = await sb
        .from("subscription_entitlements")
        .select("*")
        .eq("user_id", user.id)
        .eq("creator_id", id)
        .eq("entitlement_type", "premium_chat")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (entError) {
        console.error('Entitlement check error:', entError);
      }

      if (entitlements) {
        setHasSubscription(true);
        setLoading(false);
        return;
      }

      // If no entitlements, check subscriptions directly (fallback)
      const { data: subscription, error: subError } = await sb
        .from("subscriptions")
        .select("*, expires_at")
        .eq("subscriber_id", user.id)
        .eq("creator_id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (!subError && subscription && new Date(subscription.expires_at) > new Date()) {
        setHasSubscription(true);
      } else {
        setHasSubscription(false);
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      setHasSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Verifying access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Block access if user is not subscribed
  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              asChild
              variant="ghost"
              className="mb-6 hover:bg-muted/50"
            >
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>

            <Card className="p-8 text-center">
              {creatorProfile?.profile_image && (
                <img 
                  src={creatorProfile.profile_image} 
                  alt={creatorProfile.display_name}
                  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-primary"
                />
              )}
              <Lock className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Premium Chat Access Required</h2>
              <p className="text-muted-foreground mb-6">
                {creatorProfile?.display_name 
                  ? `Subscribe to ${creatorProfile.display_name} to access premium chat.`
                  : 'You need an active subscription to access premium chat with this creator.'}
                {' '}Get priority responses and exclusive conversations.
              </p>
              <Button
                asChild
                className="w-full gradient-primary"
                size="lg"
              >
                <Link to={`/profile/${id}`}>
                  <Crown className="w-5 h-5 mr-2" />
                  Subscribe to {creatorProfile?.display_name || 'Creator'}
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <Button asChild variant="ghost">
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Premium Chat
            </Badge>
          </div>

          {/* Import and use ChatWindow component with premium styling */}
          {creatorProfile && (
            <div className="glass-card rounded-3xl overflow-hidden border-2 border-primary/20">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <img
                    src={creatorProfile.profile_image || "/placeholder.svg"}
                    alt={creatorProfile.display_name}
                    className="w-12 h-12 rounded-full border-2 border-primary"
                  />
                  <div>
                    <h2 className="font-semibold text-lg">{creatorProfile.display_name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      <span>Premium Subscriber</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Use the Messages component with recipientId */}
              <div className="h-[600px]">
                <iframe 
                  src={`/messages/${id}`} 
                  className="w-full h-full border-0"
                  title="Premium Chat"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumChat;
