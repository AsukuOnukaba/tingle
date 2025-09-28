import { Heart, Users, Shield, Zap, Award, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              About Tingle
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're revolutionizing how creators and fans connect by building the most intimate, 
              secure, and rewarding platform for authentic relationships.
            </p>
          </div>

          {/* Mission Section */}
          <div className="glass-card rounded-3xl p-8 md:p-12 mb-16 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed text-center">
              To empower creators to build meaningful connections with their audience while providing fans 
              with exclusive access to the content and personalities they love. We believe in authentic 
              relationships, fair compensation for creators, and a safe environment for everyone.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Heart,
                title: "Authentic Connections",
                description: "We prioritize genuine relationships over superficial interactions."
              },
              {
                icon: Shield,
                title: "Safety First",
                description: "Advanced security and moderation keep our community safe and respectful."
              },
              {
                icon: Users,
                title: "Creator Empowerment",
                description: "Tools and support to help creators build sustainable income streams."
              },
              {
                icon: Zap,
                title: "Innovation",
                description: "Cutting-edge technology to enhance the creator-fan experience."
              },
              {
                icon: Award,
                title: "Quality Content",
                description: "Curated platform ensuring high-quality content and interactions."
              },
              {
                icon: Globe,
                title: "Global Community",
                description: "Connecting creators and fans from around the world."
              }
            ].map((value, index) => (
              <Card 
                key={value.title}
                className="glass-card border-border/50 animate-fade-up"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Story Section */}
          <div className="glass-card rounded-3xl p-8 md:p-12 mb-16 animate-fade-up" style={{ animationDelay: "0.6s" }}>
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="prose prose-lg text-muted-foreground mx-auto">
              <p className="mb-4">
                Founded in 2023, Tingle emerged from a simple observation: creators deserved a platform 
                that truly valued their work and fostered genuine connections with their audience. 
                Traditional social media platforms often left creators struggling to monetize their content 
                while maintaining authentic relationships with their fans.
              </p>
              <p className="mb-4">
                Our founders, a diverse team of technologists, creators, and community builders, 
                set out to create something different. A platform where creators could thrive financially 
                while building meaningful relationships, and where fans could directly support and connect 
                with the personalities they admired.
              </p>
              <p>
                Today, Tingle serves over 120,000 creators and millions of fans worldwide, 
                facilitating authentic connections and enabling creators to build sustainable businesses 
                around their passion and personality.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 animate-fade-up" style={{ animationDelay: "0.8s" }}>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-3xl font-bold text-primary mb-2">120K+</div>
              <div className="text-sm text-muted-foreground">Active Creators</div>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-3xl font-bold text-secondary mb-2">2.5M+</div>
              <div className="text-sm text-muted-foreground">Registered Users</div>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-3xl font-bold text-accent mb-2">$50M+</div>
              <div className="text-sm text-muted-foreground">Creator Earnings</div>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-3xl font-bold text-primary mb-2">195</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;