import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Heart, Gift, Image, Smile, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

// Import profile images
import profile1 from "@/assets/profiles/profile-1.jpg";

interface Message {
  id: string;
  text: string;
  sender: "user" | "creator";
  timestamp: Date;
  type?: "text" | "tip" | "unlock";
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Hey there! 😘 Thanks for subscribing to my content!",
    sender: "creator",
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    text: "Hi Emma! Love your content, you're amazing! ❤️",
    sender: "user",
    timestamp: new Date(Date.now() - 3300000),
  },
  {
    id: "3",
    text: "Aww thank you baby! Want to unlock some exclusive photos I just took? They're super spicy 🔥",
    sender: "creator",
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: "4",
    text: "I'd love to get to know you better... Maybe we could do a private video call? 💋",
    sender: "creator",
    timestamp: new Date(Date.now() - 2700000),
  },
  {
    id: "5",
    text: "That sounds amazing! How much for a private session?",
    sender: "user",
    timestamp: new Date(Date.now() - 2400000),
  },
];

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    setIsTyping(true);

    // Simulate creator response
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "That's so sweet of you to say! 😍",
        "You're making me blush! 💕",
        "I love talking to you! Want to unlock my latest photo set?",
        "You're so charming! Check out my new video 🎥",
        "Thanks for being such an amazing fan! ✨",
      ];
      
      const creatorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: "creator",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, creatorResponse]);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleTip = (amount: string) => {
    const tipMessage: Message = {
      id: Date.now().toString(),
      text: `Sent a $${amount} tip! 💸`,
      sender: "user",
      timestamp: new Date(),
      type: "tip",
    };
    
    setMessages(prev => [...prev, tipMessage]);
    
    setTimeout(() => {
      const thankYou: Message = {
        id: (Date.now() + 1).toString(),
        text: `OMG thank you so much for the $${amount} tip! You're incredible! 😘💕`,
        sender: "creator",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, thankYou]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 h-screen flex flex-col">
        {/* Chat Header */}
        <div className="glass-card border-b border-border/50 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hover:bg-muted/50 transition-smooth"
              >
                <Link to="/profile/1">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={profile1}
                    alt="Emma"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold">Emma</h3>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-none text-xs">
                    Online
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 transition-smooth"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.sender === "user"
                      ? message.type === "tip"
                        ? "gradient-secondary text-white"
                        : "gradient-primary text-white"
                      : "glass-card text-foreground"
                  } ${message.type === "tip" ? "neon-glow" : ""}`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.sender === "user" ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-up">
                <div className="glass-card px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-border/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-2 mb-4">
              <Button
                onClick={() => handleTip("5")}
                variant="outline"
                size="sm"
                className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
              >
                <Gift className="w-4 h-4 mr-1" />
                Tip $5
              </Button>
              <Button
                onClick={() => handleTip("10")}
                variant="outline"
                size="sm"
                className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
              >
                <Gift className="w-4 h-4 mr-1" />
                Tip $10
              </Button>
              <Button
                onClick={() => handleTip("25")}
                variant="outline"
                size="sm"
                className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth"
              >
                <Gift className="w-4 h-4 mr-1" />
                Tip $25
              </Button>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="glass-card border-t border-border/50 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted/50 transition-smooth"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted/50 transition-smooth"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
              />
              
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;