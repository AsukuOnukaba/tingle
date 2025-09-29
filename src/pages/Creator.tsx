import { useState } from "react";
import { ArrowLeft, Upload, DollarSign, Camera, Users, TrendingUp, Calendar, IdCard, User, Mail, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

interface CreatorFormData {
  fullLegalName: string;
  displayName: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  email: string;
  bio: string;
  contentType: string;
  monthlyPrice: string;
  instagramUrl: string;
  tiktokUrl: string;
  twitterUrl: string;
  profilePhoto: File | null;
  coverPhoto: File | null;
  governmentId: File | null;
}

interface FormErrors {
  fullLegalName?: string;
  displayName?: string;
  age?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  city?: string;
  email?: string;
  bio?: string;
  contentType?: string;
  monthlyPrice?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  governmentId?: string;
}

const Creator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<CreatorFormData>({
    fullLegalName: "",
    displayName: "",
    age: 18,
    dateOfBirth: "",
    gender: "",
    country: "",
    city: "",
    email: "",
    bio: "",
    contentType: "",
    monthlyPrice: "",
    instagramUrl: "",
    tiktokUrl: "",
    twitterUrl: "",
    profilePhoto: null,
    coverPhoto: null,
    governmentId: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

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

  const genders = ["Female", "Male", "Non-Binary", "Other", "Prefer not to say"];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof CreatorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (name: keyof CreatorFormData, file: File | null) => {
    setFormData(prev => ({ ...prev, [name]: file }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
      setErrors(prev => ({ ...prev, dateOfBirth: undefined, age: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.fullLegalName.trim()) newErrors.fullLegalName = "Full legal name is required";
    if (!formData.displayName.trim()) newErrors.displayName = "Display name is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.bio.trim()) newErrors.bio = "Bio is required";
    if (!formData.contentType) newErrors.contentType = "Content type is required";
    if (!formData.monthlyPrice || parseFloat(formData.monthlyPrice) < 5) {
      newErrors.monthlyPrice = "Monthly price must be at least $5";
    }
    if (!formData.profilePhoto) newErrors.profilePhoto = "Profile photo is required";

    // Age validation (must be 18+)
    if (formData.age < 18) {
      newErrors.age = "You must be at least 18 years old";
      newErrors.dateOfBirth = "You must be at least 18 years old";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Bio length validation
    if (formData.bio && formData.bio.length < 50) {
      newErrors.bio = "Bio must be at least 50 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Please fix the errors below",
        description: "Make sure all required fields are filled out correctly.",
      });
      return;
    }

    // Simulate form submission
    toast({
      title: "Application submitted successfully!",
      description: "You will be redirected to the pending review page.",
    });

    setTimeout(() => {
      navigate("/creator/pending");
    }, 1500);
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
          className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
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
        <p className="text-sm text-destructive">{errors[name] as string}</p>
      )}
    </div>
  );

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

          {/* Header */}
          <div className="text-center mb-12 animate-fade-up">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Become a Creator
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of creators earning money by sharing content with their fans. Complete the application below to get started.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Card className="glass-card border-border/50 text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/20 mx-auto mb-2 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-primary">$2,500</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average monthly earnings</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-secondary/20 mx-auto mb-2 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle className="text-2xl font-bold text-secondary">85%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Revenue share (you keep)</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-accent/20 mx-auto mb-2 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-2xl font-bold text-accent">24/7</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Support & tools available</p>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <Card className="glass-card border-border/50 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Creator Application</CardTitle>
              <p className="text-muted-foreground">Please provide accurate information. All applications are manually reviewed.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullLegalName">
                        Full Legal Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullLegalName"
                        name="fullLegalName"
                        placeholder="John Smith"
                        value={formData.fullLegalName}
                        onChange={handleInputChange}
                        className={`bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                          errors.fullLegalName ? "border-destructive" : ""
                        }`}
                        required
                      />
                      {errors.fullLegalName && (
                        <p className="text-sm text-destructive">{errors.fullLegalName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="displayName">
                        Display Name / Stage Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        placeholder="@yourname"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        className={`bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                          errors.displayName ? "border-destructive" : ""
                        }`}
                        required
                      />
                      {errors.displayName && (
                        <p className="text-sm text-destructive">{errors.displayName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">
                        Date of Birth <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleDateOfBirthChange}
                          className={`pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                            errors.dateOfBirth ? "border-destructive" : ""
                          }`}
                          required
                        />
                      </div>
                      {errors.dateOfBirth && (
                        <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        value={formData.age}
                        disabled
                        className="bg-muted/30 border-border/50"
                      />
                      {formData.age < 18 && (
                        <p className="text-sm text-destructive">Must be 18 or older</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Gender <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => handleSelectChange("gender", value)}
                      >
                        <SelectTrigger className={`bg-muted/50 border-border/50 focus:border-primary ${
                          errors.gender ? "border-destructive" : ""
                        }`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genders.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-sm text-destructive">{errors.gender}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        Country <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="country"
                          name="country"
                          placeholder="United States"
                          value={formData.country}
                          onChange={handleInputChange}
                          className={`pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                            errors.country ? "border-destructive" : ""
                          }`}
                          required
                        />
                      </div>
                      {errors.country && (
                        <p className="text-sm text-destructive">{errors.country}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">
                        City <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="city"
                          name="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={handleInputChange}
                          className={`pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                            errors.city ? "border-destructive" : ""
                          }`}
                          required
                        />
                      </div>
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                          errors.email ? "border-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Content Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Content Information
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="bio">
                      Short Bio or Introduction <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell your potential fans about yourself, your interests, and what type of content you create... (minimum 50 characters)"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className={`bg-muted/50 border-border/50 focus:border-primary transition-smooth min-h-[120px] ${
                        errors.bio ? "border-destructive" : ""
                      }`}
                      required
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formData.bio.length}/500 characters</span>
                      <span>Minimum 50 characters</span>
                    </div>
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Primary Content Type / Niche <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.contentType}
                        onValueChange={(value) => handleSelectChange("contentType", value)}
                      >
                        <SelectTrigger className={`bg-muted/50 border-border/50 focus:border-primary ${
                          errors.contentType ? "border-destructive" : ""
                        }`}>
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
                      {errors.contentType && (
                        <p className="text-sm text-destructive">{errors.contentType}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyPrice">
                        Monthly Subscription Price <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="monthlyPrice"
                          name="monthlyPrice"
                          type="number"
                          min="5"
                          step="0.01"
                          placeholder="19.99"
                          value={formData.monthlyPrice}
                          onChange={handleInputChange}
                          className={`pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth ${
                            errors.monthlyPrice ? "border-destructive" : ""
                          }`}
                          required
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">Minimum $5.00</p>
                      {errors.monthlyPrice && (
                        <p className="text-sm text-destructive">{errors.monthlyPrice}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Uploads */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <IdCard className="w-5 h-5 mr-2" />
                    Required Documents & Photos
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileUploadField
                      label="Profile Photo"
                      name="profilePhoto"
                      accept="image/*"
                      required
                      description="Clear headshot, PNG/JPG up to 10MB"
                    />

                    <FileUploadField
                      label="Cover Photo"
                      name="coverPhoto"
                      accept="image/*"
                      description="Banner image for your profile, PNG/JPG up to 10MB"
                    />
                  </div>

                  <FileUploadField
                    label="Government ID Upload (Optional)"
                    name="governmentId"
                    accept="image/*"
                    description="Driver's license, passport, or state ID for age verification. This is optional but helps speed up approval."
                  />
                </div>

                {/* Social Media Links */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Social Media Links (Optional)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagramUrl">Instagram</Label>
                      <Input
                        id="instagramUrl"
                        name="instagramUrl"
                        placeholder="https://instagram.com/yourhandle"
                        value={formData.instagramUrl}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tiktokUrl">TikTok</Label>
                      <Input
                        id="tiktokUrl"
                        name="tiktokUrl"
                        placeholder="https://tiktok.com/@yourhandle"
                        value={formData.tiktokUrl}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twitterUrl">Twitter/X</Label>
                      <Input
                        id="twitterUrl"
                        name="twitterUrl"
                        placeholder="https://twitter.com/yourhandle"
                        value={formData.twitterUrl}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                      />
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="glass-card p-6 rounded-lg border border-primary/20">
                  <h4 className="font-semibold mb-3 text-primary">Important Disclaimer</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    By submitting this application, you confirm that you are at least 18 years old and legally 
                    permitted to appear in adult or suggestive content. You understand that all content must 
                    comply with our Terms of Service and Community Guidelines. All applications will be manually 
                    reviewed before approval, which typically takes 24-48 hours.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={formData.age < 18}
                  className="w-full gradient-primary hover:opacity-90 transition-smooth neon-glow py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formData.age < 18 ? "Must be 18+ to Apply" : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Creator;