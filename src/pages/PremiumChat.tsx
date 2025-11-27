import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

const sb = supabase as unknown as SupabaseClient<any>;

const PremiumChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  useEffect(() => {
    checkAccess();
  }, [user, id]);

  const checkAccess = async () => {
    // Wait for auth to load
    if (!user) {
      if (!loading) {
        toast.error("Please login to access premium chat");
        navigate("/login");
      }
      return;
    }

    if (!id) return;

    try {
      // Get creator profile
      const { data: profileData, error: profileError } = await sb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;
      setCreatorProfile(profileData);

      // Check premium chat access using the new entitlements system
      const { data: hasAccess, error: accessError } = await sb
        .rpc('check_premium_chat_access', {
          p_user_id: user.id,
          p_creator_id: id
        });

      if (accessError) {
        console.error('Access check error:', accessError);
        // Fall back to checking subscriptions directly
        const { data: subData, error: subError } = await sb
          .from("subscriptions")
          .select("*, expires_at")
          .eq("subscriber_id", user.id)
          .eq("creator_id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (subError) throw subError;

        if (!subData || new Date(subData.expires_at) < new Date()) {
          toast.error("Premium chat requires an active subscription");
          navigate(`/profile/${id}`);
          return;
        }

        setHasSubscription(true);
      } else if (!hasAccess) {
        toast.error("Premium chat requires an active subscription with chat access");
        navigate(`/profile/${id}`);
        return;
      } else {
        setHasSubscription(true);
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error checking access:", error);
      toast.error(error.message || "Failed to verify access");
      navigate(`/profile/${id}`);
      setLoading(false);
    }
  };

  if (loading) {
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

  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Verifying Premium Access...</h1>
            <Button asChild variant="outline">
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Link>
            </Button>
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
