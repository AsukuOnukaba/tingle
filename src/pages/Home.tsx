import { Link } from "react-router-dom";
import { Heart, Users, Star, Shield, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-28 md:pb-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 animate-gradient-shift" 
               style={{ backgroundSize: "200% 200%" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-up">
            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full gradient-primary mx-auto mb-6 md:mb-8 flex items-center justify-center animate-pulse-neon">
              <Heart className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent px-2">
              Where Love Meets
              <br />
              <span className="text-primary">Creativity</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
              Connect with amazing creators, build meaningful relationships, and unlock exclusive content. 
              The future of intimate connections is here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12 animate-fade-up px-4" style={{ animationDelay: "0.2s" }}>
              <Button 
                asChild
                size="lg"
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow text-base md:text-lg px-6 py-5 md:px-8 md:py-6 w-full sm:w-auto"
              >
                <Link to="/explore">
                  Explore Creators
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Link>
              </Button>
              
              <Button 
                asChild
                variant="outline"
                size="lg"
                className="bg-background/50 border-primary/30 hover:bg-primary/10 transition-smooth text-base md:text-lg px-6 py-5 md:px-8 md:py-6 w-full sm:w-auto"
              >
                <Link to="/creator">
                  Become a Creator
                  <Star className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Link>
              </Button>
            </div>
            
            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto animate-fade-up px-4" style={{ animationDelay: "0.4s" }}>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">120K+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary mb-1 md:mb-2">2.5M+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent mb-1 md:mb-2">500K+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Messages Daily</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">98%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-16 animate-fade-up">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent px-2">
              Why Choose Tingle?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Experience the perfect blend of social connection and content creation in a safe, premium environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Heart,
                title: "Authentic Connections",
                description: "Build genuine relationships with creators who share your interests and passions.",
                gradient: "from-primary to-secondary"
              },
              {
                icon: Shield,
                title: "Safe & Secure",
                description: "Advanced security measures ensure your privacy and safety are always protected.",
                gradient: "from-secondary to-accent"
              },
              {
                icon: Users,
                title: "Premium Content",
                description: "Access exclusive content from top creators around the world in HD quality.",
                gradient: "from-accent to-primary"
              }
            ].map((feature, index) => (
              <Card 
                key={feature.title}
                className="glass-card border-border/50 hover-scale transition-smooth animate-fade-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <CardContent className="p-6 md:p-8 text-center">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r ${feature.gradient} mx-auto mb-4 md:mb-6 flex items-center justify-center`}>
                    <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-6 sm:p-8 md:p-12 rounded-2xl md:rounded-3xl animate-fade-up">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent px-2">
              Ready to Start Your Journey?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              Join thousands of creators and fans who have already discovered the future of intimate connections.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Button 
                asChild
                size="lg"
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow text-base md:text-lg px-6 py-5 md:px-8 md:py-6 w-full sm:w-auto"
              >
                <Link to="/login">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Link>
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="bg-background/50 border-primary/30 hover:bg-primary/10 transition-smooth text-base md:text-lg px-6 py-5 md:px-8 md:py-6 w-full sm:w-auto"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;