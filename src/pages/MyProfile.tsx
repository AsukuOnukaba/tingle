import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Heart, MessageCircle, Settings, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import profile1 from "@/assets/profiles/profile-1.jpg";

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "",
    age: 25,
    location: "",
    bio: "",
    profile_image: profile1,
  });
  const [likes, setLikes] = useState(0);
  const [subscriptions, setSubscriptions] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchProfile();
    fetchStats();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setProfile({
        display_name: data.display_name || "",
        age: data.age || 25,
        location: data.location || "",
        bio: data.bio || "",
        profile_image: data.profile_image || profile1,
      });
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    const { data: likesData } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id);

    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("subscriber_id", user.id)
      .eq("is_active", true);

    setLikes(likesData?.length || 0);
    setSubscriptions(subsData?.length || 0);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: profile.display_name,
          age: profile.age,
          location: profile.location,
          bio: profile.bio,
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
            <div className="relative">
              {/* Cover */}
              <div className="h-48 md:h-64 gradient-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-16 left-8">
                <div className="relative group">
                  <img
                    src={profile.profile_image}
                    alt={profile.display_name}
                    className="w-32 h-32 rounded-full border-4 border-background object-cover"
                  />
                  <button className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Edit Button */}
              <div className="absolute top-4 right-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </div>

            <div className="pt-20 pb-8 px-8">
              {isEditing ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Display Name</label>
                    <Input
                      value={profile.display_name}
                      onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                      placeholder="Your display name"
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Age</label>
                    <Input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, State"
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Bio</label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="bg-muted/50 border-border/50 min-h-[100px]"
                    />
                  </div>
                  <Button onClick={handleSave} className="gradient-primary hover:opacity-90 transition-smooth w-full">
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-2">
                    {profile.display_name || "Set your name"}
                    {profile.age && `, ${profile.age}`}
                  </h1>
                  {profile.location && (
                    <div className="flex items-center text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      {profile.location}
                    </div>
                  )}
                  {profile.bio && (
                    <p className="text-foreground/80 leading-relaxed">{profile.bio}</p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{likes}</div>
                  <div className="text-sm text-muted-foreground">Likes Given</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{subscriptions}</div>
                  <div className="text-sm text-muted-foreground">Subscriptions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">0</div>
                  <div className="text-sm text-muted-foreground">Messages</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="activity" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <TabsList className="grid grid-cols-2 mb-8 bg-muted/50">
              <TabsTrigger value="activity" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Heart className="w-4 h-4 mr-2" />
                My Activity
              </TabsTrigger>
              <TabsTrigger value="creator" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                <Crown className="w-4 h-4 mr-2" />
                Become a Creator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Your Subscriptions</h3>
                  {subscriptions === 0 ? (
                    <div className="text-center py-12">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        You haven't subscribed to anyone yet
                      </p>
                      <Button
                        onClick={() => navigate("/explore")}
                        className="gradient-primary hover:opacity-90 transition-smooth"
                      >
                        Explore Creators
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">View all your active subscriptions here.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creator">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-4">Start Earning with Tingle</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Turn your content into income. Set your prices, connect with fans, and get instant crypto payouts.
                    </p>
                    <Button
                      onClick={() => navigate("/creator")}
                      className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
                    >
                      Apply as Creator
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
