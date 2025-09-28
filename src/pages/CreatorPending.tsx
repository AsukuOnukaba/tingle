import { Link } from "react-router-dom";
import { CheckCircle, Clock, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";

const CreatorPending = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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

          {/* Success Animation */}
          <div className="animate-fade-up">
            <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-8 flex items-center justify-center animate-pulse-neon">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Application Submitted!
            </h1>
            
            <p className="text-lg text-muted-foreground mb-12">
              Thank you for applying to become a creator on Tingle. We're excited to review your application!
            </p>
          </div>

          {/* Status Card */}
          <Card className="glass-card border-border/50 mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-secondary" />
                <span>Application Under Review</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <span className="text-sm">Application Received</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Complete</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <span className="text-sm">Background Review</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-secondary animate-pulse" />
                    <span className="text-sm text-secondary">In Progress</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                  <span className="text-sm">Account Setup</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="glass-card border-border/50 mb-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div>
                  <p className="font-medium">Review Process (24-48 hours)</p>
                  <p className="text-sm text-muted-foreground">Our team will review your application and verify your information</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                <div>
                  <p className="font-medium">Email Notification</p>
                  <p className="text-sm text-muted-foreground">You'll receive an email once your application is approved</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                <div>
                  <p className="font-medium">Account Activation</p>
                  <p className="text-sm text-muted-foreground">Complete your profile setup and start creating content</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.6s" }}>
            <p className="text-muted-foreground">
              While you wait, explore other creators and get inspired!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
              >
                <Link to="/">
                  <Heart className="w-4 h-4 mr-2" />
                  Explore Creators
                </Link>
              </Button>
              
              <Button
                asChild
                variant="outline"
                className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
              >
                <Link to="/profile/1">
                  View Sample Profile
                </Link>
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-12 p-6 glass-card rounded-2xl animate-fade-up" style={{ animationDelay: "0.8s" }}>
            <p className="text-sm text-muted-foreground">
              Have questions about your application? Contact us at{" "}
              <a href="mailto:creators@tingle.com" className="text-primary hover:underline">
                creators@tingle.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorPending;