import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, DollarSign, Star, MapPin, Calendar, Camera, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { getProfile } from "@/lib/profileData";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SubscriptionModal } from "@/components/SubscriptionModal";

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { setCurrentProfileId } = useCurrentProfile();
  const [activeTab, setActiveTab] = useState("photos");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const profile = getProfile(Number(id));

  useEffect(() => {
    setCurrentProfileId(id || "1");
    checkSubscription();
    if (profile) {
      fetchCreatorId(profile.id);
    }
  }, [id, setCurrentProfileId, profile]);

  const fetchCreatorId = async (profileId: number) => {
    try {
      const { data, error } = await (supabase as any)
        .from('creators')
        .select('id')
        .eq('user_id', String(profileId))
        .eq('status', 'approved')
        .maybeSingle();

      if (data && !error) {
        setCreatorId(data.id);
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    }
  };

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('*, expires_at')
        .eq('subscriber_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data && !error) {
        const expiryDate = new Date(data.expires_at);
        const now = new Date();
        
        // Check if subscription has expired
        if (expiryDate < now) {
          // Deactivate expired subscription
          await (supabase as any)
            .from('subscriptions')
            .update({ is_active: false })
            .eq('id', data.id);
          
          setIsSubscribed(false);
          setSubscriptionExpiry(null);
          toast.error("Your subscription has expired. You've been moved to the Basic plan.");
        } else {
          setIsSubscribed(true);
          setSubscriptionExpiry(expiryDate);
        }
      } else {
        setIsSubscribed(false);
        setSubscriptionExpiry(null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleScrollToPricing = () => {
    // First switch to pricing tab
    setActiveTab('pricing');
    
    // Wait for tab content to render, then scroll and highlight
    setTimeout(() => {
      const pricingSection = document.getElementById('pricing-section');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the section briefly
        pricingSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          pricingSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }, 100);
  };

  const handleSubscribe = (tierIndex: number) => {
    if (!user) {
      toast.error("Please login to subscribe");
      return;
    }
    if (!creatorId) {
      toast.error("Creator profile not found");
      return;
    }
    const tier = profile.tiers[tierIndex];
    if (tier.price === "Free") {
      return; // Don't open modal for free tier
    }
    setSelectedTier(tierIndex);
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionSuccess = () => {
    checkSubscription();
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('subscriptions')
        .update({ is_active: false })
        .eq('subscriber_id', user.id)
        .eq('creator_id', id);

      if (error) throw error;

      setIsSubscribed(false);
      toast.success("Successfully unsubscribed");
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      toast.error(error.message || "Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            className="mb-6 hover:bg-muted/50 transition-smooth"
          >
            <Link to="/explore">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Explore
            </Link>
          </Button>

          {/* Profile Header */}
          <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
            <div className="relative">
              {/* Cover/Hero Image */}
              <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 relative overflow-hidden">
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-16 left-8">
                <div className="relative">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-32 h-32 rounded-full border-4 border-background object-cover"
                  />
                  {profile.isOnline && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                      Live
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-20 pb-8 px-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center mb-2">
                    <h1 className="text-3xl font-bold mr-3">{profile.name}, {profile.age}</h1>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {profile.rating}
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    {profile.location}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined {profile.joined}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                  >
                    <Link to={`/chat/${id}`}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Link>
                  </Button>
                  {isSubscribed ? (
                    <Button 
                      onClick={handleUnsubscribe}
                      disabled={loading}
                      variant="outline"
                      className="border-primary/50 hover:bg-primary/10 transition-smooth"
                    >
                      <Heart className="w-4 h-4 mr-2 fill-current text-primary" />
                      Unsubscribe
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleScrollToPricing}
                      disabled={loading}
                      className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Subscribe
                    </Button>
                  )}
                </div>
                {subscriptionExpiry && isSubscribed && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Expires: {subscriptionExpiry.toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{profile.subscribers}</div>
                  <div className="text-sm text-muted-foreground">Subscribers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{profile.posts}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{profile.rating}</div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-foreground/80 leading-relaxed">{profile.bio}</p>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <TabsList className="grid grid-cols-3 mb-8 bg-muted/50">
              <TabsTrigger value="photos" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Camera className="w-4 h-4 mr-2" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                About
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photos">
              <div className="mb-6 grid grid-cols-2 gap-4">
                <Button
                  asChild
                  className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
                >
                  <Link to={`/premium/${id}/gallery`}>
                    <Lock className="w-4 h-4 mr-2" />
                    Premium Gallery
                  </Link>
                </Button>
                <Button
                  asChild
                  className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
                >
                  <Link to={`/premium/${id}/chat`}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Premium Chat
                  </Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {profile.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square group cursor-pointer">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl profile-blur group-hover:filter-none transition-smooth"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-smooth" />
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm p-2 rounded-full">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                ))}
                
                {/* Subscribe CTA */}
                {!isSubscribed && (
                  <div className="aspect-square glass-card rounded-xl flex flex-col items-center justify-center text-center p-6">
                    <Lock className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Unlock All Content</h3>
                    <p className="text-sm text-muted-foreground mb-4">Subscribe to see {profile.posts}+ exclusive photos and videos</p>
                    <Button 
                      size="sm" 
                      onClick={() => handleSubscribe(1)}
                      disabled={loading}
                      className="gradient-primary hover:opacity-90 transition-smooth"
                    >
                      Subscribe Now
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="about">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">About {profile.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-muted-foreground">{profile.bio}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Location</h4>
                        <p className="text-muted-foreground">{profile.location}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Member Since</h4>
                        <p className="text-muted-foreground">{profile.joined}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Interests</h4>
                      <div className="flex flex-wrap gap-2">
                        {["Photography", "Fashion", "Travel", "Fitness", "Art"].map((interest) => (
                          <Badge key={interest} variant="secondary" className="bg-muted/50">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing">
              <div id="pricing-section" className="grid gap-6 md:grid-cols-3 transition-all duration-300">
                {profile.tiers.map((tier, index) => (
                  <Card
                    key={tier.name}
                    className={`glass-card border-border/50 cursor-pointer transition-smooth hover-scale ${
                      selectedTier === index ? "border-primary/50 neon-glow" : ""
                    }`}
                    onClick={() => setSelectedTier(index)}
                  >
                    <CardContent className="p-6 text-center">
                      <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                      <div className="text-3xl font-bold text-primary mb-4">{tier.price}</div>
                      {tier.price !== "Free" && (
                        <div className="text-sm text-muted-foreground mb-6">per month</div>
                      )}
                      {tier.price === "Free" && (
                        <div className="text-sm text-muted-foreground mb-6">Always free</div>
                      )}
                      <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                        {tier.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center">
                            <Star className="w-3 h-3 text-primary mr-2 fill-current" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleSubscribe(index)}
                        disabled={loading || (tier.price === "Free") || (isSubscribed && selectedTier === index)}
                        className={`w-full transition-smooth ${
                          isSubscribed && selectedTier === index
                            ? "gradient-primary hover:opacity-90 neon-glow"
                            : "bg-muted/50 border-border/50 hover:bg-muted"
                        }`}
                      >
                        {tier.price === "Free" ? "Free Access" : (isSubscribed && selectedTier === index ? "Current Plan" : "Choose Plan")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {creatorId && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          plan={profile.tiers[selectedTier]}
          creatorId={creatorId}
          creatorName={profile.name}
          onSuccess={handleSubscriptionSuccess}
        />
      )}
    </div>
  );
};

export default Profile;