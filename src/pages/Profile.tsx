import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, DollarSign, Star, MapPin, Calendar, Camera, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { ProfileReviews } from "@/components/ProfileReviews";
import defaultProfile from "@/assets/profiles/profile-1.jpg";

interface ProfileData {
  id: string;
  display_name: string;
  age: number;
  location: string | null;
  profile_image: string | null;
  cover_image: string | null;
  bio: string | null;
  rating: number | null;
  price: number | null;
  is_online: boolean | null;
  created_at: string | null;
}

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCurrentProfileId } = useCurrentProfile();
  const [activeTab, setActiveTab] = useState("photos");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);
  const [creatorPlans, setCreatorPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    if (id) {
      setCurrentProfileId(id);
      fetchProfile(id);
      fetchCreatorId(id);
      checkSubscription();
      fetchUserPhotos(id);
    }
  }, [id, setCurrentProfileId]);

  useEffect(() => {
    if (creatorId) {
      fetchCreatorPlans();
    }
  }, [creatorId]);

  const fetchProfile = async (profileId: string) => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error("Profile not found");
        navigate('/explore');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPhotos = async (profileId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_photos')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUserPhotos(data);
      }
    } catch (error) {
      console.error('Error fetching user photos:', error);
    }
  };

  const fetchCreatorId = async (profileIdParam: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('creators')
        .select('id')
        .eq('user_id', profileIdParam)
        .eq('status', 'approved')
        .maybeSingle();

      if (data && !error) {
        setCreatorId(data.id);
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    }
  };

  const fetchCreatorPlans = async () => {
    if (!creatorId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('subscription_plans')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (!error && data) {
        setCreatorPlans(data);
      }
    } catch (error) {
      console.error('Error fetching creator plans:', error);
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

  const handleSubscribe = (plan?: any) => {
    if (!user) {
      toast.error("Please login to subscribe");
      return;
    }
    if (!creatorId) {
      toast.error("This profile is not set up as a creator yet. Only approved creators can accept subscriptions.");
      return;
    }
    // Always open modal - it will show "no plans" message if needed
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-pulse">
              <div className="h-48 md:h-64 bg-muted" />
              <div className="pt-20 pb-8 px-8">
                <div className="h-8 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
            <Button asChild>
              <Link to="/explore">Back to Explore</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const profileImage = profile.profile_image || defaultProfile;
  const coverImage = profile.cover_image || profileImage;
  const displayName = profile.display_name || "Unknown";
  const location = profile.location || "Location not set";
  const bio = profile.bio || "No bio available";
  const rating = profile.rating || 4.8;
  const isCreator = creatorId !== null;
  const joinedDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : "Recently";

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
                  src={coverImage}
                  alt={displayName}
                  className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-16 left-8">
                <div className="relative">
                  <img
                    src={profileImage}
                    alt={displayName}
                    className="w-32 h-32 rounded-full border-4 border-background object-cover"
                  />
                  {profile.is_online && (
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
                    <h1 className="text-3xl font-bold mr-3">{displayName}, {profile.age}</h1>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {rating}
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    {location}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined {joinedDate}
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
                  {isCreator && (
                    isSubscribed ? (
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
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Subscribe
                      </Button>
                    )
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
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Subscribers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{userPhotos.length}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{rating}</div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-foreground/80 leading-relaxed">{bio}</p>
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
              <TabsTrigger value="reviews" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Star className="w-4 h-4 mr-2" />
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photos">
              {isCreator && (
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
              )}
              
              {userPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userPhotos.map((photo, index) => (
                    <div key={photo.id} className="relative aspect-square group cursor-pointer">
                      <img
                        src={photo.thumbnail_url || photo.file_url}
                        alt={photo.caption || `Photo ${index + 1}`}
                        className={`w-full h-full object-cover rounded-xl transition-smooth ${
                          photo.is_premium && !isSubscribed ? "profile-blur group-hover:filter-none" : ""
                        }`}
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-smooth" />
                      {photo.is_premium && !isSubscribed && (
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm p-2 rounded-full">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Subscribe CTA */}
                  {!isSubscribed && isCreator && (
                    <div className="aspect-square glass-card rounded-xl flex flex-col items-center justify-center text-center p-6">
                      <Lock className="w-8 h-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Unlock All Content</h3>
                      <p className="text-sm text-muted-foreground mb-4">Subscribe to see {userPhotos.length}+ exclusive photos</p>
                      <Button 
                        size="sm" 
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="gradient-primary hover:opacity-90 transition-smooth"
                      >
                        Subscribe Now
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
                  <p className="text-muted-foreground">This profile hasn't uploaded any photos yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="about">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">About {displayName}</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-muted-foreground">{bio}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Location</h4>
                        <p className="text-muted-foreground">{location}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Member Since</h4>
                        <p className="text-muted-foreground">{joinedDate}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Age</h4>
                        <p className="text-muted-foreground">{profile.age} years old</p>
                      </div>
                      {isCreator && profile.price && (
                        <div>
                          <h4 className="font-medium mb-2">Subscription Price</h4>
                          <p className="text-muted-foreground">₦{Number(profile.price).toLocaleString()}/month</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <ProfileReviews profileId={id || ""} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => {
            setShowSubscriptionModal(false);
          }}
          plans={creatorPlans}
          creatorId={creatorId || ""}
          creatorName={displayName}
          onSuccess={handleSubscriptionSuccess}
        />
      )}
    </div>
  );
};

export default Profile;