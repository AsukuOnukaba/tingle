import { useState, useRef, useEffect } from "react";
import { Send, Gift, Image, Smile, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  timestamp: Date;
  type?: "text" | "tip";
  delivery_status?: "sent" | "delivered" | "read";
}

interface Profile {
  id: string;
  display_name: string;
  profile_image: string;
  is_online: boolean;
}

interface ChatWindowProps {
  recipientId: string;
}

const ChatWindow = ({ recipientId }: ChatWindowProps) => {
  const { currentProfileId } = useCurrentProfile();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch recipient profile
  useEffect(() => {
    if (!recipientId) return;

    const fetchProfile = async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, profile_image, is_online")
        .eq("id", recipientId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const presenceChannel = supabase
      .channel(`profile_${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${recipientId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setProfile(prev => prev ? {
              ...prev,
              is_online: updated.is_online || false
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [recipientId]);

  // Fetch messages
  useEffect(() => {
    if (!recipientId || !currentProfileId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${currentProfileId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentProfileId})`)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data) {
          setMessages(data.map((m: any) => ({
            id: String(m.id),
            text: m.text || "",
            sender_id: m.sender_id,
            timestamp: new Date(m.created_at || Date.now()),
            type: m.type as "text" | "tip",
            delivery_status: m.delivery_status as "sent" | "delivered" | "read"
          })));
          scrollToBottom();

          // Mark messages as read
          const unreadIds = data
            .filter((m: any) => m.recipient_id === currentProfileId && !m.is_read)
            .map((m: any) => m.id);

          if (unreadIds.length > 0) {
            await (supabase as any)
              .from("messages")
              .update({ 
                is_read: true, 
                delivery_status: 'read',
                read_at: new Date().toISOString()
              })
              .in("id", unreadIds);
          }
        }
      } catch (err) {
        console.error("Fetch messages failed:", err);
      }
    };

    fetchMessages();
  }, [recipientId, currentProfileId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!recipientId || !currentProfileId) return;

    const channel = supabase
      .channel(`chat_${currentProfileId}_${recipientId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages"
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg) return;
          
          const isRelevant = 
            (newMsg.sender_id === currentProfileId && newMsg.recipient_id === recipientId) ||
            (newMsg.sender_id === recipientId && newMsg.recipient_id === currentProfileId);
          
          if (!isRelevant) return;
          
          const newMessageObj: Message = {
            id: String(newMsg.id),
            text: newMsg.text ?? "",
            sender_id: newMsg.sender_id,
            timestamp: new Date(newMsg.created_at || Date.now()),
            type: newMsg.type ?? "text",
            delivery_status: newMsg.delivery_status ?? "sent"
          };
          
          setMessages((prev) => [...prev, newMessageObj]);
          scrollToBottom();

          // Mark as delivered if we're the recipient
          if (newMsg.recipient_id === currentProfileId) {
            await (supabase as any)
              .from("messages")
              .update({ 
                delivery_status: 'delivered',
                delivered_at: new Date().toISOString()
              })
              .eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages(prev => prev.map(m => 
            m.id === String(updated.id) 
              ? { ...m, delivery_status: updated.delivery_status }
              : m
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, currentProfileId]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!recipientId || !currentProfileId) return;

    const conversationId = [currentProfileId, recipientId].sort().join("_");

    const typingChannel = supabase
      .channel(`typing_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const typing = payload.new as any;
          if (typing && typing.user_id === recipientId) {
            setIsTyping(typing.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [recipientId, currentProfileId]);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!currentProfileId || !recipientId) return;

    const conversationId = [currentProfileId, recipientId].sort().join("_");

    await (supabase as any)
      .from("typing_status")
      .upsert({
        conversation_id: conversationId,
        user_id: currentProfileId,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id'
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status to true
    updateTypingStatus(true);

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentProfileId || !recipientId) return;

    const messageText = newMessage.trim();
    const conversationId = [currentProfileId, recipientId].sort().join("_");
    
    // Create optimistic message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender_id: currentProfileId,
      timestamp: new Date(),
      type: "text",
      delivery_status: profile?.is_online ? 'delivered' : 'sent'
    };
    
    // Update UI immediately
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();
    
    // Clear typing status
    updateTypingStatus(false);

    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentProfileId,
          recipient_id: recipientId,
          text: messageText,
          type: "text",
          is_read: false,
          delivery_status: profile?.is_online ? 'delivered' : 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? {
          id: String(data.id),
          text: data.text,
          sender_id: data.sender_id,
          timestamp: new Date(data.created_at),
          type: data.type as "text" | "tip",
          delivery_status: data.delivery_status as "sent" | "delivered" | "read"
        } : m
      ));

    } catch (error: any) {
      console.error("Error sending message:", error);
      // Remove temp message and restore input on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = () => {
    toast({
      title: "Feature coming soon",
      description: "Image sharing will be available soon!"
    });
  };

  const handleEmojiPicker = () => {
    toast({
      title: "Feature coming soon", 
      description: "Emoji picker will be available soon!"
    });
  };

  const handleTip = async (amount: string) => {
    if (!currentProfileId || !recipientId) return;

    const tipPayload = {
      conversation_id: [currentProfileId, recipientId].sort().join("_"),
      text: `Sent a $${amount} tip`,
      sender_id: currentProfileId,
      recipient_id: recipientId,
      type: "tip",
      is_read: false,
      delivery_status: profile?.is_online ? 'delivered' : 'sent'
    };

    try {
      await (supabase as any).from("messages").insert([tipPayload]);
      
      toast({
        title: "Tip sent!",
        description: `You sent $${amount} to ${profile?.display_name}`
      });
    } catch (err) {
      console.error("Tip failed:", err);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDeliveryIcon = (status?: string, isSent?: boolean) => {
    if (!isSent) return null;
    
    if (status === 'read') {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    } else if (status === 'delivered') {
      return <CheckCheck className="w-3 h-3" />;
    }
    return <Check className="w-3 h-3" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="glass-card border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {profile && (
              <>
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={profile.profile_image} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  {profile.is_online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{profile.display_name}</h3>
                  <Badge variant="secondary" className={`${profile.is_online ? "bg-green-500/20 text-green-400" : "bg-muted/50"} border-none text-xs`}>
                    {profile.is_online ? "Online" : "Offline"}
                  </Badge>
                </div>
              </>
            )}
          </div>

          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/10">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => {
            const isSent = message.sender_id === currentProfileId;
            return (
              <div key={message.id} className={`flex ${isSent ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  isSent 
                    ? message.type === "tip" 
                      ? "gradient-secondary text-white" 
                      : "gradient-primary text-white" 
                    : "glass-card text-foreground"
                } ${message.type === "tip" ? "neon-glow" : ""}`}>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${isSent ? "text-white/70" : "text-muted-foreground"}`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {getDeliveryIcon(message.delivery_status, isSent)}
                  </div>
                </div>
              </div>
            );
          })}

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
            <Button onClick={() => handleTip("5")} variant="outline" size="sm">
              <Gift className="w-4 h-4 mr-1" />
              Tip $5
            </Button>
            <Button onClick={() => handleTip("10")} variant="outline" size="sm">
              <Gift className="w-4 h-4 mr-1" />
              Tip $10
            </Button>
            <Button onClick={() => handleTip("25")} variant="outline" size="sm">
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
              <Button type="button" variant="ghost" size="sm" onClick={handleImageUpload}>
                <Image className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleEmojiPicker}>
                <Smile className="w-4 h-4" />
              </Button>
            </div>

            <Input 
              value={newMessage} 
              onChange={handleInputChange}
              placeholder="Type a message..." 
              className="flex-1 bg-muted/50 border-border/50 focus:border-primary"
            />

            <Button 
              type="submit" 
              disabled={!newMessage.trim()} 
              className="gradient-primary hover:opacity-90 neon-glow"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
