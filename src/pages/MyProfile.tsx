import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Calendar, Edit2, Save, X, Upload, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navigation from "@/components/Navigation";
import { BecomeCreatorButton } from "@/integrations/components/BecomeCreatorButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { toast } from "sonner";
import { moderateImageFile } from "@/lib/contentModeration";

interface UserPhoto {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_premium: boolean;
  price: number;
  created_at: string;
}

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
    cover_image: "",
  });
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCreatorPrompt, setShowCreatorPrompt] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    
    if (user) {
      fetchProfile();
      fetchPhotos();
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
          cover_image: data.cover_image || "",
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
            cover_image: "",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const fetchPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("user_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error("Error fetching photos:", error);
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
          cover_image: profile.cover_image || null,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Moderate image file
    const moderation = moderateImageFile(file);
    
    if (!moderation.isAllowed) {
      toast.error(moderation.warnings.join(". "));
      e.target.value = ""; // Reset input
      return;
    }

    // Show content policy reminder
    if (moderation.warnings.length > 0) {
      toast.warning(moderation.warnings[0], { duration: 5000 });
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      if (type === "profile") {
        setProfile({ ...profile, profile_image: data.publicUrl });
      } else {
        setProfile({ ...profile, cover_image: data.publicUrl });
      }
      
      toast.success(`${type === "profile" ? "Profile" : "Cover"} image uploaded successfully!`);
      e.target.value = ""; // Reset input
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      e.target.value = ""; // Reset input
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      console.log("No file selected or user not found");
      return;
    }

    console.log("Starting photo upload for file:", file.name);

    // Moderate image file
    const moderation = moderateImageFile(file);
    
    if (!moderation.isAllowed) {
      toast.error(moderation.warnings.join(". "));
      e.target.value = ""; // Reset input
      return;
    }

    // Show content policy reminder
    if (moderation.warnings.length > 0) {
      toast.warning(moderation.warnings[0], { duration: 5000 });
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/photo-${Date.now()}.${fileExt}`;

      console.log("Uploading to storage:", fileName);

      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      console.log("Inserting to database:", urlData.publicUrl);

      const { error: insertError } = await (supabase as any)
        .from("user_photos")
        .insert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          is_premium: false,
          price: 0,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      toast.success("Photo uploaded successfully!");
      e.target.value = ""; // Reset input
      fetchPhotos();
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/user-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split("?")[0];
        
        // Delete from storage
        await supabase.storage
          .from("user-photos")
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await (supabase as any)
        .from("user_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      toast.success("Photo deleted successfully!");
      fetchPhotos();
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleTogglePremium = async (photoId: string, currentStatus: boolean) => {
    if (!currentStatus && !isCreator) {
      setShowCreatorPrompt(true);
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("user_photos")
        .update({
          is_premium: !currentStatus,
          price: !currentStatus ? 10 : 0, // Default price of 10 for premium
        })
        .eq("id", photoId);

      if (error) throw error;

      toast.success(`Photo marked as ${!currentStatus ? "premium" : "free"}`);
      fetchPhotos();
    } catch (error: any) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update photo");
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
              <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 relative overflow-hidden group">
                {profile.cover_image ? (
                  <img
                    src={profile.cover_image}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                )}
                {isEditing && (
                  <div className="space-y-2">
                    <label className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-lg cursor-pointer hover:bg-background transition-smooth z-10">
                      <Camera className="w-4 h-4 inline mr-2" />
                      Change Cover
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "cover")}
                      />
                    </label>
                    <p className="absolute top-16 left-4 text-xs text-white bg-black/60 backdrop-blur-sm px-3 py-1 rounded-md z-10">
                      Recommended: 1500x500px (3:1 ratio)
                    </p>
                  </div>
                )}
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
                        onChange={(e) => handleImageUpload(e, "profile")}
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

          {/* Photo Gallery */}
          <div className="glass-card rounded-3xl p-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Photos</h2>
              <div>
                <Button 
                  disabled={uploadingPhoto} 
                  className="gradient-primary"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </div>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden group bg-muted"
                  >
                    <img
                      src={photo.file_url}
                      alt={photo.caption || "User photo"}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center gap-2 p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={photo.is_premium ? "default" : "outline"}
                          onClick={() => handleTogglePremium(photo.id, photo.is_premium)}
                          className="text-xs"
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          {photo.is_premium ? "Premium" : "Free"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPhotoToDelete(photo.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {photo.is_premium && (
                        <Badge className="bg-primary text-xs">
                          ₦{(photo.price * 1600).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No photos yet</p>
                <p className="text-sm">Upload your first photo to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creator Prompt Dialog */}
      <AlertDialog open={showCreatorPrompt} onOpenChange={setShowCreatorPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Become a Creator</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be an approved creator to mark photos as premium content. 
              Would you like to apply to become a creator?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <BecomeCreatorButton />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const photo = photos.find(p => p.id === photoToDelete);
                if (photo) handleDeletePhoto(photo.id, photo.file_url);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyProfile;
