import { useState } from "react";
import { ArrowLeft, Send, Image, Heart, Gift, Crown, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { getProfile } from "@/lib/profileData";

const PremiumChat = () => {
  const { id } = useParams();
  const profile = getProfile(Number(id));
  const [message, setMessage] = useState("");

  // Mock premium chat messages
  const messages = [
    {
      id: 1,
      sender: "creator",
      content: "Hey babe! Thanks for subscribing to my premium tier! 💕",
      timestamp: "2:30 PM",
      isPremium: true
    },
    {
      id: 2,
      sender: "user",
      content: `Hi ${profile.name}! I'm so excited to be here ✨`,
      timestamp: "2:31 PM"
    },
    {
      id: 3,
      sender: "creator",
      content: "I have some exclusive photos I took just for you today 📸",
      timestamp: "2:32 PM",
      isPremium: true,
      hasAttachment: true
    },
    {
      id: 4,
      sender: "creator",
      content: "What kind of content would you like to see more of? I love taking requests from my premium subscribers 😘",
      timestamp: "2:33 PM",
      isPremium: true
    },
    {
      id: 5,
      sender: "user",
      content: "I'd love to see more behind-the-scenes content!",
      timestamp: "2:35 PM"
    },
    {
      id: 6,
      sender: "creator",
      content: "Perfect! I'm actually doing a photoshoot tomorrow. I'll make sure to capture some exclusive behind-the-scenes moments just for you! 🎬✨",
      timestamp: "2:36 PM",
      isPremium: true
    }
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      // In a real app, this would send the message
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      {/* Chat Header */}
      <div className="glass-card border-b border-border/50 p-4 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 transition-smooth"
            >
              <Link to={`/profile/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {profile.isOnline && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-xs flex items-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />
                      Live
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-semibold">{profile.name}</h2>
                    <Crown className="w-4 h-4 text-primary" />
                    <Badge className="gradient-primary text-white text-xs">Premium</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Usually replies instantly</p>
                </div>
              </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
              <Gift className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Premium Access Banner */}
          <div className="glass-card rounded-2xl p-6 text-center animate-fade-up">
            <Crown className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Premium Chat Access</h3>
            <p className="text-muted-foreground">
              You have unlimited messaging access with {profile.name}. Enjoy exclusive conversations and priority responses!
            </p>
          </div>

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex animate-fade-up ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`max-w-xs lg:max-w-md ${msg.sender === "user" ? "order-2" : "order-1"}`}>
                {msg.sender === "creator" && (
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium">{profile.name}</span>
                    {msg.isPremium && (
                      <Crown className="w-3 h-3 text-primary" />
                    )}
                  </div>
                )}
                
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.sender === "user"
                      ? "gradient-primary text-white"
                      : msg.isPremium
                      ? "glass-card border-primary/30"
                      : "glass-card border-border/50"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.hasAttachment && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Image className="w-4 h-4" />
                        <span className="text-xs">exclusive_photos.jpg</span>
                        <Badge className="bg-primary/20 text-primary text-xs">Premium</Badge>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`text-xs text-muted-foreground mt-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="glass-card border-t border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 transition-smooth"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 transition-smooth"
            >
              <Image className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                placeholder="Send a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="bg-muted/50 border-border/50 focus:border-primary transition-smooth pr-12"
              />
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="gradient-primary hover:opacity-90 transition-smooth"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex justify-center mt-3">
            <p className="text-xs text-muted-foreground">
              Premium members get priority responses and unlimited messaging ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumChat;