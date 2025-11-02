import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Calendar, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { BecomeCreatorButton } from "@/integrations/components/BecomeCreatorButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { toast } from "sonner";

const MyProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isCreator, loading: rolesLoading } = useRoles();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "",
    age: "",
    location: "",
    bio: "",
    profile_image: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          display_name: data.display_name || "",
          age: data.age?.toString() || "",
          location: data.location || "",
          bio: data.bio || "",
          profile_image: data.profile_image || "",
        });
      } else {
        // Create profile if it doesn't exist
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email || "";
        const username = email.split("@")[0];
        
        const { error: insertError } = await (supabase as any)
          .from("profiles")
          .insert({
            id: user.id,
            display_name: username,
            age: 18,
          });

        if (!insertError) {
          setProfile({
            display_name: username,
            age: "18",
            location: "",
            bio: "",
            profile_image: "",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!profile.display_name || !profile.age) {
      toast.error("Name and age are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          display_name: profile.display_name,
          age: parseInt(profile.age),
          location: profile.location || null,
          bio: profile.bio || null,
          profile_image: profile.profile_image || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media-content")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("media-content")
        .getPublicUrl(filePath);

      setProfile({ ...profile, profile_image: data.publicUrl });
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
            <div className="relative">
              {/* Cover Image */}
              <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 relative overflow-hidden">
                {profile.profile_image && (
                  <img
                    src={profile.profile_image}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-30"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-16 left-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-background overflow-hidden bg-muted">
                    {profile.profile_image ? (
                      <img
                        src={profile.profile_image}
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:opacity-90 transition-smooth">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <div className="absolute top-4 right-4">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="bg-background/50 backdrop-blur-sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      size="sm"
                      className="gradient-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        fetchProfile();
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-background/50 backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-20 pb-8 px-8">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_name">Display Name *</Label>
                      <Input
                        id="display_name"
                        value={profile.display_name}
                        onChange={(e) =>
                          setProfile({ ...profile, display_name: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age *</Label>
                      <Input
                        id="age"
                        type="number"
                        value={profile.age}
                        onChange={(e) =>
                          setProfile({ ...profile, age: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) =>
                        setProfile({ ...profile, location: e.target.value })
                      }
                      placeholder="e.g., New York, USA"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="mb-4 md:mb-0">
                      <div className="flex items-center mb-2">
                        <h1 className="text-3xl font-bold mr-3">
                          {profile.display_name}
                          {profile.age && `, ${profile.age}`}
                        </h1>
                        {isCreator && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            Creator
                          </Badge>
                        )}
                      </div>
                      {profile.location && (
                        <div className="flex items-center text-muted-foreground mb-2">
                          <MapPin className="w-4 h-4 mr-2" />
                          {profile.location}
                        </div>
                      )}
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        Joined {new Date(user?.created_at || "").toLocaleDateString()}
                      </div>
                    </div>

                    {!isCreator && (
                      <BecomeCreatorButton />
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio ? (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">About</h3>
                      <p className="text-foreground/80 leading-relaxed">{profile.bio}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Complete your profile to get started!</p>
                      <p className="text-sm mt-2">
                        Add a bio, profile picture, and other details to make your profile stand out.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
