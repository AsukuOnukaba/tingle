import { useState } from "react";
import { ArrowLeft, Upload, DollarSign, Camera, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Creator = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    bio: "",
    monthlyPrice: "",
    location: "",
    categories: [] as string[],
  });

  const categories = [
    "Lifestyle", "Fashion", "Fitness", "Travel", "Art", "Photography",
    "Music", "Dance", "Cooking", "Gaming", "Beauty", "Comedy"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate creator application
    navigate("/creator/pending");
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
            <Link to="/">
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
              Turn your passion into profit. Join thousands of creators earning money by sharing content with their fans.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Application Form */}
            <div className="lg:col-span-2">
              <Card className="glass-card border-border/50 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Creator Application</CardTitle>
                  <p className="text-muted-foreground">Tell us about yourself and what content you'll create</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          placeholder="Your display name"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          name="username"
                          placeholder="@username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Tell your fans about yourself..."
                        value={formData.bio}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50 focus:border-primary transition-smooth min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyPrice">Monthly Subscription Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="monthlyPrice"
                            name="monthlyPrice"
                            type="number"
                            placeholder="19.99"
                            value={formData.monthlyPrice}
                            onChange={handleInputChange}
                            className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          name="location"
                          placeholder="City, State"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                          required
                        />
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                      <Label>Content Categories</Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <Badge
                            key={category}
                            variant={formData.categories.includes(category) ? "default" : "secondary"}
                            className={`cursor-pointer transition-smooth hover-scale ${
                              formData.categories.includes(category)
                                ? "gradient-primary text-white neon-glow"
                                : "bg-muted/50 text-muted-foreground hover:text-primary"
                            }`}
                            onClick={() => handleCategoryToggle(category)}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">Select categories that best describe your content</p>
                    </div>

                    {/* Profile Photo Upload */}
                    <div className="space-y-2">
                      <Label>Profile Photo</Label>
                      <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-smooth">
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                        >
                          Choose File
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full gradient-primary hover:opacity-90 transition-smooth neon-glow py-6 text-lg font-semibold"
                    >
                      Submit Application
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Sidebar */}
            <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.6s" }}>
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Creator Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium">High Revenue Share</p>
                      <p className="text-sm text-muted-foreground">Keep 85% of your earnings</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Multiple Revenue Streams</p>
                      <p className="text-sm text-muted-foreground">Subscriptions, tips, custom content</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Analytics Dashboard</p>
                      <p className="text-sm text-muted-foreground">Track your performance and earnings</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Creator Support</p>
                      <p className="text-sm text-muted-foreground">24/7 support and creator tools</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Application Process</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full gradient-primary text-white text-sm font-bold flex items-center justify-center">1</div>
                    <p className="text-sm">Submit application</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold flex items-center justify-center">2</div>
                    <p className="text-sm">Review process (24-48 hours)</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold flex items-center justify-center">3</div>
                    <p className="text-sm">Account approval & setup</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold flex items-center justify-center">4</div>
                    <p className="text-sm">Start creating and earning!</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Creator;