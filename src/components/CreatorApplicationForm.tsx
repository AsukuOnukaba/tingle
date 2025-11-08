import { useState, useEffect } from "react";
import { Upload, Camera, User, Mail, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface CreatorFormData {
  displayName: string;
  email: string;
  dateOfBirth: string;
  age: number;
  location: string;
  phone: string;
  contentType: string;
  categories: string[];
  languages: string[];
  bio: string;
  profilePhoto: File | null;
  governmentId: File | null;
  instagramUrl: string;
  tiktokUrl: string;
  twitterUrl: string;
}

interface FormErrors {
  [key: string]: string;
}

const contentTypes = [
  "Flirting",
  "Cosplay", 
  "Fitness",
  "Premium Chat",
  "Adult Content",
  "Feet",
  "Roleplay",
  "Voice Content",
  "Photography",
  "Art & Creative",
  "Lifestyle",
  "Fashion",
  "Music & Dance",
  "Gaming",
  "ASMR",
  "Other"
];

const allCategories = ["Lifestyle", "Fashion", "Gaming", "Art", "Music", "Fitness", "Beauty", "Tech", "Food", "Travel"];
const allLanguages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Korean", "Chinese"];

interface ProfileData {
  email?: string;
  displayName?: string;
  location?: string;
  age?: number;
  bio?: string;
}

interface CreatorApplicationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: ProfileData;
}

export const CreatorApplicationForm = ({ onSuccess, onCancel, initialData }: CreatorApplicationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  
  const [formData, setFormData] = useState<CreatorFormData>({
    displayName: initialData?.displayName || "",
    email: initialData?.email || "",
    dateOfBirth: "",
    age: initialData?.age || 18,
    location: initialData?.location || "",
    phone: "",
    contentType: "",
    categories: [],
    languages: [],
    bio: initialData?.bio || "",
    profilePhoto: null,
    governmentId: null,
    instagramUrl: "",
    tiktokUrl: "",
    twitterUrl: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Check for existing application on mount
  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCheckingApplication(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('creator_applications')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (data) {
          setExistingApplication(data);
        }
      } catch (error) {
        console.log('No existing application found');
      } finally {
        setCheckingApplication(false);
      }
    };

    checkExistingApplication();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: keyof CreatorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (name: keyof CreatorFormData, file: File | null) => {
    setFormData(prev => ({ ...prev, [name]: file }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateOfBirth = e.target.value;
    const calculatedAge = calculateAge(dateOfBirth);
    
    setFormData(prev => ({
      ...prev,
      dateOfBirth,
      age: calculatedAge
    }));

    if (errors.dateOfBirth || errors.age) {
      setErrors(prev => ({ ...prev, dateOfBirth: "", age: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.displayName.trim()) newErrors.displayName = "Display name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.contentType) newErrors.contentType = "Content type is required";
    if (!formData.bio.trim()) newErrors.bio = "Bio is required";
    if (!formData.profilePhoto) newErrors.profilePhoto = "Profile photo is required";
    if (!formData.governmentId) newErrors.governmentId = "Government ID is required";

    if (formData.age < 18) {
      newErrors.age = "You must be at least 18 years old";
      newErrors.dateOfBirth = "You must be at least 18 years old";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.bio && formData.bio.length < 50) {
      newErrors.bio = "Bio must be at least 50 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Please fix the errors",
        description: "Make sure all required fields are filled out correctly.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in to submit your application.",
        });
        return;
      }

      // Upload both files in parallel for faster performance
      const uploadPromises = [];
      
      if (formData.profilePhoto) {
        const fileExt = formData.profilePhoto.name.split('.').pop();
        const fileName = `${session.user.id}-profile-${Date.now()}.${fileExt}`;
        const filePath = `creator-applications/${fileName}`;
        
        uploadPromises.push(
          supabase.storage
            .from('profile-images')
            .upload(filePath, formData.profilePhoto)
            .then(({ error }) => {
              if (error) throw error;
              const { data: { publicUrl } } = supabase.storage
                .from('profile-images')
                .getPublicUrl(filePath);
              return { type: 'profile', url: publicUrl };
            })
        );
      }

      if (formData.governmentId) {
        const fileExt = formData.governmentId.name.split('.').pop();
        const fileName = `${session.user.id}-govid-${Date.now()}.${fileExt}`;
        const filePath = `creator-applications/${fileName}`;
        
        uploadPromises.push(
          supabase.storage
            .from('profile-images')
            .upload(filePath, formData.governmentId)
            .then(({ error }) => {
              if (error) throw error;
              const { data: { publicUrl } } = supabase.storage
                .from('profile-images')
                .getPublicUrl(filePath);
              return { type: 'government', url: publicUrl };
            })
        );
      }

      const uploadResults = await Promise.all(uploadPromises);
      
      let profilePhotoUrl = '';
      let governmentIdUrl = '';
      
      uploadResults.forEach(result => {
        if (result.type === 'profile') profilePhotoUrl = result.url;
        if (result.type === 'government') governmentIdUrl = result.url;
      });

      // Save application to database
      let dbError;
      
      if (existingApplication) {
        // Update existing application (for resubmissions)
        const { error } = await (supabase as any)
          .from('creator_applications')
          .update({
            display_name: formData.displayName,
            email: formData.email,
            date_of_birth: formData.dateOfBirth,
            age: formData.age,
            location: formData.location,
            phone: formData.phone,
            content_type: formData.contentType,
            categories: formData.categories,
            languages: formData.languages,
            bio: formData.bio,
            profile_photo_url: profilePhotoUrl,
            government_id_url: governmentIdUrl,
            social_media: {
              instagram: formData.instagramUrl,
              tiktok: formData.tiktokUrl,
              twitter: formData.twitterUrl,
            },
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id);
        
        dbError = error;
      } else {
        // Insert new application
        const { error } = await (supabase as any)
          .from('creator_applications')
          .insert({
            user_id: session.user.id,
            display_name: formData.displayName,
            email: formData.email,
            date_of_birth: formData.dateOfBirth,
            age: formData.age,
            location: formData.location,
            phone: formData.phone,
            content_type: formData.contentType,
            categories: formData.categories,
            languages: formData.languages,
            bio: formData.bio,
            profile_photo_url: profilePhotoUrl,
            government_id_url: governmentIdUrl,
            social_media: {
              instagram: formData.instagramUrl,
              tiktok: formData.tiktokUrl,
              twitter: formData.twitterUrl,
            },
            status: 'pending'
          });
        
        dbError = error;
      }

      if (dbError) {
        if (dbError.code === '23505') {
          toast({
            variant: "destructive",
            title: "Application exists",
            description: "You already have a pending application.",
          });
          return;
        }
        throw dbError;
      }

      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the admin for review.",
      });

      // Send notification email to admin (non-blocking, fire and forget)
      supabase.functions.invoke('notify-creator-application', {
        body: { 
          user_id: session.user.id, 
          display_name: formData.displayName, 
          email: formData.email 
        },
      }).catch(emailError => {
        console.error('Error sending notification:', emailError);
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        variant: "destructive",
        title: "Submission error",
        description: error.message || "There was an error submitting your application.",
      });
    } finally {
      setLoading(false);
    }
  };

  const FileUploadField = ({ 
    label, 
    name, 
    accept, 
    required = false,
    description 
  }: { 
    label: string; 
    name: keyof CreatorFormData; 
    accept: string; 
    required?: boolean;
    description?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={name as string}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-smooth ${
        errors[name] ? "border-destructive" : "border-border/50 hover:border-primary/50"
      }`}>
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground mb-2">Click to upload or drag and drop</p>
        {description && <p className="text-sm text-muted-foreground mb-2">{description}</p>}
        <input
          type="file"
          id={name as string}
          accept={accept}
          onChange={(e) => handleFileChange(name, e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(name as string)?.click()}
        >
          Choose File
        </Button>
        {formData[name] && (
          <p className="text-sm text-primary mt-2">
            ✓ {(formData[name] as File).name}
          </p>
        )}
      </div>
      {errors[name] && (
        <p className="text-sm text-destructive">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto px-2">
      {checkingApplication && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Checking application status...</p>
        </div>
      )}

      {!checkingApplication && existingApplication && (
        <Alert className={existingApplication.status === 'pending' ? 'border-yellow-500/50 bg-yellow-500/10' : existingApplication.status === 'approved' ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}>
          {existingApplication.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
          {existingApplication.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {existingApplication.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
          <AlertTitle>
            {existingApplication.status === 'pending' && 'Application Pending'}
            {existingApplication.status === 'approved' && 'Application Approved'}
            {existingApplication.status === 'rejected' && 'Application Rejected'}
          </AlertTitle>
          <AlertDescription>
            {existingApplication.status === 'pending' && 'Your creator application is currently under review. We will notify you once it has been processed.'}
            {existingApplication.status === 'approved' && 'Congratulations! Your creator application has been approved. You can now access the creator dashboard.'}
            {existingApplication.status === 'rejected' && `Your application was rejected. Reason: ${existingApplication.rejection_reason || 'Not specified'}`}
          </AlertDescription>
        </Alert>
      )}

      {!checkingApplication && !existingApplication && (
        <>
      {/* Personal Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <User className="w-5 h-5 mr-2" />
          Personal Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="Your stage name"
              value={formData.displayName}
              onChange={handleInputChange}
              className={errors.displayName ? "border-destructive" : ""}
            />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">
              Date of Birth <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleDateOfBirthChange}
              max={new Date().toISOString().split('T')[0]}
              className={errors.dateOfBirth ? "border-destructive" : ""}
            />
            {formData.dateOfBirth && (
              <p className="text-sm text-muted-foreground">Age: {formData.age} years</p>
            )}
            {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              Location <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                name="location"
                placeholder="City, Country"
                value={formData.location}
                onChange={handleInputChange}
                className={`pl-10 ${errors.location ? "border-destructive" : ""}`}
              />
            </div>
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      {/* Content Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Camera className="w-5 h-5 mr-2" />
          Content Information
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contentType">
              Content Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.contentType}
              onValueChange={(value) => handleSelectChange("contentType", value)}
            >
              <SelectTrigger className={errors.contentType ? "border-destructive" : ""}>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contentType && <p className="text-sm text-destructive">{errors.contentType}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio <span className="text-destructive">*</span> (minimum 50 characters)
            </Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself and what kind of content you create..."
              value={formData.bio}
              onChange={handleInputChange}
              className={`min-h-[150px] ${errors.bio ? "border-destructive" : ""}`}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/1000 characters
            </p>
            {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
          </div>
        </div>
      </div>

      {/* Document Uploads */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Document Verification</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploadField
            label="Profile Photo"
            name="profilePhoto"
            accept="image/*"
            required
            description="Clear photo of yourself"
          />
          
          <FileUploadField
            label="Government ID"
            name="governmentId"
            accept="image/*,.pdf"
            required
            description="For age verification (passport, driver's license, etc.)"
          />
        </div>
      </div>

      {/* Social Media */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Social Media (optional)
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input
              id="instagramUrl"
              name="instagramUrl"
              placeholder="https://instagram.com/username"
              value={formData.instagramUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktokUrl">TikTok URL</Label>
            <Input
              id="tiktokUrl"
              name="tiktokUrl"
              placeholder="https://tiktok.com/@username"
              value={formData.tiktokUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitterUrl">Twitter/X URL</Label>
            <Input
              id="twitterUrl"
              name="twitterUrl"
              placeholder="https://twitter.com/username"
              value={formData.twitterUrl}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || (existingApplication && existingApplication.status !== 'rejected')}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || formData.age < 18 || (existingApplication && existingApplication.status !== 'rejected')}
          className="flex-1 gradient-primary"
        >
          {loading ? "Submitting..." : existingApplication?.status === 'rejected' ? "Resubmit Application" : "Submit Application"}
        </Button>
      </div>

      {formData.age < 18 && formData.dateOfBirth && (
        <p className="text-sm text-destructive text-center">
          You must be at least 18 years old to apply
        </p>
      )}
        </>
      )}
    </form>
  );
};