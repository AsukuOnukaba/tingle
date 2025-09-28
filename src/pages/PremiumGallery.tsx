import { useState } from "react";
import { ArrowLeft, Download, Heart, Share2, Play, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";

// Import profile images
import profile1 from "@/assets/profiles/profile-1.jpg";
import profile2 from "@/assets/profiles/profile-2.jpg";
import profile3 from "@/assets/profiles/profile-3.jpg";

const PremiumGallery = () => {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);

  // Mock premium content - in real app this would be fetched based on subscription
  const premiumContent = [
    {
      id: 1,
      type: "image",
      url: profile1,
      title: "Behind the Scenes",
      likes: 142,
      isNew: true
    },
    {
      id: 2,
      type: "video",
      url: profile2,
      title: "Exclusive Tutorial",
      likes: 89,
      isNew: false
    },
    {
      id: 3,
      type: "image",
      url: profile3,
      title: "Personal Moments",
      likes: 203,
      isNew: true
    },
    {
      id: 4,
      type: "image",
      url: profile1,
      title: "Photoshoot Preview",
      likes: 156,
      isNew: false
    },
    {
      id: 5,
      type: "video",
      url: profile2,
      title: "Live Stream Highlights",
      likes: 98,
      isNew: false
    },
    {
      id: 6,
      type: "image",
      url: profile3,
      title: "Daily Diary",
      likes: 67,
      isNew: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted/50 transition-smooth"
            >
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-primary" />
              <Badge className="gradient-primary text-white">
                Premium Access
              </Badge>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Featured Content */}
              <div className="glass-card rounded-3xl overflow-hidden mb-8 animate-fade-up">
                <div className="relative aspect-video bg-gradient-to-r from-primary/20 to-secondary/20">
                  <img
                    src={premiumContent[selectedImage].url}
                    alt={premiumContent[selectedImage].title}
                    className="w-full h-full object-cover"
                  />
                  {premiumContent[selectedImage].type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition-smooth">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  )}
                  {premiumContent[selectedImage].isNew && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-white">New</Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{premiumContent[selectedImage].title}</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-5 h-5 text-primary" />
                        <span className="text-sm">{premiumContent[selectedImage].likes}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Exclusive content available only to premium subscribers. Thank you for your support! ✨
                  </p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                {premiumContent.map((content, index) => (
                  <div
                    key={content.id}
                    className={`relative aspect-square cursor-pointer rounded-xl overflow-hidden transition-smooth hover-scale ${
                      selectedImage === index ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={content.url}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                    {content.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    )}
                    {content.isNew && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-smooth" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Creator Info */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <div className="text-center">
                  <img
                    src={profile1}
                    alt="Emma"
                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-bold mb-2">Emma's Premium Gallery</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Exclusive content for subscribers only
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{premiumContent.length}</div>
                      <div className="text-xs text-muted-foreground">Items</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary">3</div>
                      <div className="text-xs text-muted-foreground">New Today</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <h4 className="font-semibold mb-4">Recent Updates</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="text-sm">
                      <div className="font-medium">New photo set added</div>
                      <div className="text-muted-foreground text-xs">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-secondary rounded-full" />
                    <div className="text-sm">
                      <div className="font-medium">Live stream recording</div>
                      <div className="text-muted-foreground text-xs">Yesterday</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <div className="text-sm">
                      <div className="font-medium">Behind the scenes</div>
                      <div className="text-muted-foreground text-xs">3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "0.5s" }}>
                <h4 className="font-semibold mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <Button 
                    asChild
                    className="w-full gradient-primary hover:opacity-90 transition-smooth"
                  >
                    <Link to="/chat">
                      Send Message
                    </Link>
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
                  >
                    Request Custom Content
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumGallery;