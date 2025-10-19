import { useState, useEffect } from "react";
import { ArrowLeft, Download, Heart, Share2, Play, Lock, Crown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { PurchaseConfirmationModal } from "@/components/PurchaseConfirmationModal";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getProfile } from "@/lib/profileData";

const sb = supabase as unknown as SupabaseClient<any>;

const PremiumGallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = getProfile(Number(id));
  const [selectedImage, setSelectedImage] = useState(0);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatorWalletAddress, setCreatorWalletAddress] = useState<string>();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
      checkPurchaseStatus();
      fetchWalletBalance();
      fetchCreatorWallet();
    } else {
      setLoading(false);
    }
  }, [user, id]);

  const checkSubscriptionStatus = async () => {
    if (!id || !user) return;
    
    try {
      const { data, error } = await sb
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("creator_id", id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      setHasSubscription(!!data);
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await sb
        .from("purchases")
        .select("id")
        .eq("user_id", user?.id)
        .eq("content_id", id)
        .eq("status", "completed")
        .maybeSingle();

      if (error) throw error;
      setHasPurchased(!!data);
    } catch (error) {
      console.error("Error checking purchase status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { data, error } = await sb
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const fetchCreatorWallet = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await sb
        .from("creators")
        .select("wallet_address")
        .eq("user_id", id)
        .maybeSingle();

      if (error) throw error;
      setCreatorWalletAddress(data?.wallet_address);
    } catch (error) {
      console.error("Error fetching creator wallet:", error);
    }
  };

  const handlePurchaseClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase premium content.",
        variant: "destructive",
      });
      return;
    }

    if (!hasSubscription) {
      toast({
        title: "Subscription Required",
        description: "You need to subscribe to this creator first before purchasing content.",
        variant: "destructive",
      });
      navigate(`/profile/${id}`);
      return;
    }

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

  // Mock premium content
  const contentPrice = 9.99;
  const premiumContent = [
    {
      id: 1,
      type: "image",
      url: profile.photos[0],
      title: "Behind the Scenes",
      likes: 142,
      isNew: true
    },
    {
      id: 2,
      type: "video",
      url: profile.photos[1],
      title: "Exclusive Tutorial",
      likes: 89,
      isNew: false
    },
    {
      id: 3,
      type: "image",
      url: profile.photos[2],
      title: "Personal Moments",
      likes: 203,
      isNew: true
    },
    {
      id: 4,
      type: "image",
      url: profile.photos[0],
      title: "Photoshoot Preview",
      likes: 156,
      isNew: false
    },
    {
      id: 5,
      type: "video",
      url: profile.photos[1],
      title: "Live Stream Highlights",
      likes: 98,
      isNew: false
    },
    {
      id: 6,
      type: "image",
      url: profile.photos[2],
      title: "Daily Diary",
      likes: 67,
      isNew: true
    }
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <PurchaseConfirmationModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        contentId={id || ""}
        contentTitle={premiumContent[selectedImage].title}
        price={contentPrice}
        walletBalance={walletBalance}
        onPurchaseSuccess={handlePurchaseSuccess}
        creatorWalletAddress={creatorWalletAddress}
      />
      
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
                <span className="text-sm font-medium">${walletBalance.toFixed(2)}</span>
              </div>
              {hasPurchased ? (
                <Badge className="gradient-primary text-white">
                  <Crown className="w-4 h-4 mr-1" />
                  Owned
                </Badge>
              ) : (
                <Badge variant="outline" className="border-primary text-primary">
                  <Lock className="w-4 h-4 mr-1" />
                  ${contentPrice.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Featured Content */}
              <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
                <div className="relative aspect-video bg-gradient-to-r from-primary/20 to-secondary/20">
                  {!hasPurchased && (
                    <div className="absolute inset-0 backdrop-blur-xl bg-black/30 flex items-center justify-center z-10">
                      <div className="text-center space-y-4">
                        <Lock className="w-16 h-16 text-white mx-auto" />
                        <div>
                          <p className="text-white text-xl font-semibold mb-2">Premium Content</p>
                          <p className="text-white/80 mb-4">Purchase to unlock and download</p>
                          <Button
                            onClick={handlePurchaseClick}
                            className="gradient-primary"
                            size="lg"
                          >
                            <Crown className="w-5 h-5 mr-2" />
                            Purchase for ${contentPrice.toFixed(2)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <img
                    src={premiumContent[selectedImage].url}
                    alt={premiumContent[selectedImage].title}
                    className={`w-full h-full object-cover ${!hasPurchased ? 'blur-sm' : ''}`}
                  />
                  {premiumContent[selectedImage].type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition-smooth">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  )}
                  {premiumContent[selectedImage].isNew && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-white">New</Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{premiumContent[selectedImage].title}</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-5 h-5 text-primary" />
                        <span className="text-sm">{premiumContent[selectedImage].likes}</span>
                      </div>
                      <Button variant="ghost" size="sm" disabled={!hasPurchased}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!hasPurchased}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Exclusive content available only to premium subscribers. Thank you for your support! ✨
                  </p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                {premiumContent.map((content, index) => (
                  <div
                    key={content.id}
                    className={`relative aspect-square cursor-pointer rounded-xl overflow-hidden transition-smooth hover-scale ${
                      selectedImage === index ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={content.url}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                    {content.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    )}
                    {content.isNew && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-smooth" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Creator Info */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <div className="text-center">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-bold mb-2">{profile.name}'s Premium Gallery</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Exclusive content for subscribers only
                  </p>
                  {!hasSubscription && (
                    <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary">
                        Subscribe to {profile.name} to unlock content
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
                      <div className="text-2xl font-bold text-secondary">3</div>
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
                  {hasPurchased ? (
                    <>
                      <Button 
                        asChild
                        className="w-full gradient-primary hover:opacity-90 transition-smooth"
                      >
                        <Link to="/my-purchases">
                          View All Purchases
                        </Link>
                      </Button>
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                      >
                        <Link to="/chat">
                          Send Message
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handlePurchaseClick}
                      className="w-full gradient-primary hover:opacity-90 transition-smooth"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Unlock Content
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