import { useState, useEffect } from "react";
import { ArrowLeft, Download, Heart, Share2, Play, Lock, Crown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { PurchaseConfirmationModal } from "@/components/PurchaseConfirmationModal";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";

const sb = supabase as unknown as SupabaseClient<any>;

const PremiumGallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatorWalletAddress, setCreatorWalletAddress] = useState<string>();
  const [premiumContent, setPremiumContent] = useState<any[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && id) {
      checkSubscriptionStatus();
      fetchWalletBalance();
      fetchCreatorData();
      fetchPremiumContent();
    } else {
      setLoading(false);
    }
  }, [user, id]);

  const checkSubscriptionStatus = async () => {
    if (!id || !user) return;
    
    try {
      // Get creator ID first
      const { data: creatorData } = await sb
        .from("creators")
        .select("id")
        .eq("user_id", id)
        .maybeSingle();

      if (!creatorData) return;

      const { data, error } = await sb
        .from("subscriptions")
        .select("*")
        .eq("subscriber_id", user.id)
        .eq("creator_id", creatorData.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      // Check if subscription is still valid
      if (data) {
        const expiryDate = new Date(data.expires_at);
        const now = new Date();
        setHasSubscription(expiryDate > now);
      } else {
        setHasSubscription(false);
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
      setHasSubscription(false);
    }
  };

  const fetchCreatorData = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setCreatorProfile(data);
      }

      // Get creator wallet
      const { data: creatorData } = await sb
        .from("creators")
        .select("wallet_address")
        .eq("user_id", id)
        .maybeSingle();

      if (creatorData) {
        setCreatorWalletAddress(creatorData.wallet_address);
      }
    } catch (error) {
      console.error("Error fetching creator data:", error);
    }
  };

  const fetchPremiumContent = async () => {
    if (!id) return;
    
    try {
      // Get creator ID
      const { data: creatorData } = await sb
        .from("creators")
        .select("id")
        .eq("user_id", id)
        .maybeSingle();

      if (!creatorData) {
        setLoading(false);
        return;
      }

      // Fetch premium media
      const { data: mediaData, error } = await sb
        .from("media")
        .select("*")
        .eq("creator_id", creatorData.id)
        .eq("is_premium", true)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setPremiumContent(mediaData || []);
    } catch (error) {
      console.error("Error fetching premium content:", error);
      setPremiumContent([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { data, error } = await sb
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const handlePurchaseClick = (mediaId: string, price: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase premium content.",
        variant: "destructive",
      });
      return;
    }

    // Can access via subscription OR individual purchase
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSuccess = () => {
    setHasPurchased(true);
    fetchWalletBalance();
    toast({
      title: "Success",
      description: "Content unlocked! You can now view and download this premium content.",
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Creator not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no premium content exists - NO subscription prompt
  if (premiumContent.length === 0) {
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
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No Premium Content Available</h2>
              <p className="text-muted-foreground mb-6">
                This creator hasn't uploaded any premium content yet.
              </p>
              <Button
                asChild
                className="w-full"
              >
                <Link to={`/profile/${id}`}>
                  View Profile
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const selectedContent = premiumContent[selectedImage] || premiumContent[0];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {selectedContent && (
        <PurchaseConfirmationModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          contentId={selectedContent.id}
          contentTitle={selectedContent.title}
          price={selectedContent.price}
          walletBalance={walletBalance}
          onPurchaseSuccess={handlePurchaseSuccess}
          creatorWalletAddress={creatorWalletAddress}
        />
      )}
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted/50 transition-smooth"
            >
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">₦{walletBalance.toLocaleString()}</span>
              </div>
              {hasSubscription && (
                <Badge className="gradient-primary text-white">
                  <Crown className="w-4 h-4 mr-1" />
                  Subscribed
                </Badge>
              )}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Featured Content */}
              {premiumContent.length > 0 ? (
                <>
                  <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
                    <div className="relative aspect-video bg-gradient-to-r from-primary/20 to-secondary/20">
                      {!hasSubscription && (
                        <div className="absolute inset-0 backdrop-blur-xl bg-black/30 flex items-center justify-center z-10">
                          <div className="text-center space-y-4">
                            <Lock className="w-16 h-16 text-white mx-auto" />
                            <div>
                              <p className="text-white text-xl font-semibold mb-2">Premium Content</p>
                              <p className="text-white/80 mb-4">Subscribe to unlock all content</p>
                              <Button
                                onClick={() => navigate(`/profile/${id}`)}
                                className="gradient-primary"
                                size="lg"
                              >
                                <Crown className="w-5 h-5 mr-2" />
                                Subscribe to {creatorProfile.display_name}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      <img
                        src={selectedContent.file_url}
                        alt={selectedContent.title}
                        className={`w-full h-full object-cover ${!hasSubscription ? 'blur-sm' : ''}`}
                      />
                      {selectedContent.type === "video" && hasSubscription && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition-smooth">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold">{selectedContent.title}</h2>
                          {selectedContent.description && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedContent.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <Button variant="ghost" size="sm" disabled={!hasSubscription}>
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={!hasSubscription}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {selectedContent.price > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">₦{selectedContent.price.toLocaleString()}</span>
                          {hasSubscription && " - Included in your subscription"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                    {premiumContent.map((content, index) => (
                      <div
                        key={content.id}
                        className={`relative aspect-square cursor-pointer rounded-xl overflow-hidden transition-smooth hover-scale ${
                          selectedImage === index ? "ring-2 ring-primary" : ""
                        } ${!hasSubscription ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img
                          src={content.thumbnail_url || content.file_url}
                          alt={content.title}
                          className={`w-full h-full object-cover ${!hasSubscription ? 'blur-sm' : ''}`}
                        />
                        {!hasSubscription && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white drop-shadow-lg" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-smooth" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Premium Content Yet</h3>
                  <p className="text-muted-foreground">
                    This creator hasn't uploaded any premium content yet. Check back later!
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Creator Info */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <div className="text-center">
                  <img
                    src={creatorProfile.profile_image}
                    alt={creatorProfile.display_name}
                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-bold mb-2">{creatorProfile.display_name}'s Premium Gallery</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Exclusive content for subscribers
                  </p>
                  {!hasSubscription && (
                    <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary">
                        Subscribe to unlock all content
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="mt-2 gradient-primary"
                      >
                        <Link to={`/profile/${id}`}>
                          Subscribe Now
                        </Link>
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{premiumContent.length}</div>
                      <div className="text-xs text-muted-foreground">Items</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary">
                        {premiumContent.filter(c => {
                          const createdAt = new Date(c.created_at);
                          const today = new Date();
                          return createdAt.toDateString() === today.toDateString();
                        }).length}
                      </div>
                      <div className="text-xs text-muted-foreground">New Today</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <h4 className="font-semibold mb-4">Recent Updates</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="text-sm">
                      <div className="font-medium">New photo set added</div>
                      <div className="text-muted-foreground text-xs">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-secondary rounded-full" />
                    <div className="text-sm">
                      <div className="font-medium">Live stream recording</div>
                      <div className="text-muted-foreground text-xs">Yesterday</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <div className="text-sm">
                      <div className="font-medium">Behind the scenes</div>
                      <div className="text-muted-foreground text-xs">3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.5s" }}>
                <h4 className="font-semibold mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  {hasSubscription ? (
                    <>
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                      >
                        <Link to={`/messages/${id}`}>
                          Send Message
                        </Link>
                      </Button>
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                      >
                        <Link to={`/profile/${id}`}>
                          View Profile
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => navigate(`/profile/${id}`)}
                      className="w-full gradient-primary hover:opacity-90 transition-smooth"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumGallery;