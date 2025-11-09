import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Gift, Image, Smile, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { supabase } from './../integrations/supabase/client.ts';
import { Button } from './../integrations/components/ui/button.tsx';
import { Database } from './../lib/database.types.ts';

interface Message {
  id: string;
  text: string;
  sender: "user" | "creator";
  timestamp: Date;
  type?: "text" | "tip" | "unlock";
}

interface Profile {
  id: string;
  display_name: string;
  profile_image: string;
  is_online: boolean;
}

type DBMessage = Database["public"]["Tables"]["messages"]["Row"];

const mapDbMessageToMessage = (row: DBMessage, currentUserId: string | null): Message => {
  const senderRole = row.sender_id === currentUserId ? "user" : "creator";
  return {
    id: String(row.id),
    text: String(row.text ?? ""),
    sender: senderRole,
    timestamp: new Date(row.created_at ?? Date.now()),
    type: (row.type ?? "text") as Message["type"],
  };
};

const Chat = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { currentProfileId } = useCurrentProfile();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---------- Scroll to Bottom ----------
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ---------- Fetch Recipient Profile & Subscribe to Presence ----------
  useEffect(() => {
    if (!recipientId) return;

    const fetchProfile = async () => {
      const { data, error }: any = await (supabase as any)
        .from("profiles")
        .select("id, display_name, profile_image, is_online, last_activity_at")
        .eq("id", recipientId)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          id: data.id,
          display_name: data.display_name,
          profile_image: data.profile_image || '',
          is_online: data.is_online || false,
        });
      }
    };

    fetchProfile();

    // Subscribe to profile changes for real-time presence updates
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

  // ---------- Fetch Messages ----------
  useEffect(() => {
    if (!recipientId || !currentProfileId) return;

    let cancelled = false;
    const fetchMessages = async () => {
      try {
        // Fetch messages between current user and recipient
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${currentProfileId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentProfileId})`)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }

        if (data && !cancelled) {
          const formatted: Message[] = (data as DBMessage[]).map((m) =>
            mapDbMessageToMessage(m, currentProfileId ?? null)
          );

          setMessages(formatted);
          scrollToBottom();
        }
      } catch (err) {
        console.error("Fetch messages failed:", err);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [recipientId, currentProfileId]);

  // ---------- Subscribe to Real-time Messages ----------
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
        (payload) => {
          const newMsg = payload.new as DBMessage;
          if (!newMsg) return;
          
          // Only add message if it's part of this conversation
          const isRelevant = 
            (newMsg.sender_id === currentProfileId && newMsg.recipient_id === recipientId) ||
            (newMsg.sender_id === recipientId && newMsg.recipient_id === currentProfileId);
          
          if (!isRelevant) return;
          
          const newMessageObj: Message = {
            id: String(newMsg.id),
            text: newMsg.text ?? "",
            sender: newMsg.sender_id === currentProfileId ? "user" : "creator",
            timestamp: new Date(newMsg.created_at || Date.now()),
            type: (newMsg.type as "text" | "tip" | "unlock") ?? "text",
          };
          setMessages((prev) => [...prev, newMessageObj]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, currentProfileId]);

  // ---------- Send Message ----------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentProfileId || !recipientId) return;

    const messagePayload = {
      conversation_id: [currentProfileId, recipientId].sort().join("_"),
      sender_id: currentProfileId,
      recipient_id: recipientId,
      text: newMessage.trim(),
      type: "text",
      is_read: false,
    };

    // Optimistic update
    const tempMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      const { data: insertData, error: insertError } = await supabase
        .from("messages")
        .insert([messagePayload satisfies Database["public"]["Tables"]["messages"]["Insert"]])
        .select()
        .single();

      if (insertError) {
        console.error("Error sending message:", insertError);
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      } else if (insertData) {
        const insertedData = insertData as DBMessage;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMessage.id
              ? {
                ...m,
                id: insertedData.id.toString(),
                timestamp: new Date(insertedData.created_at),
              }
              : m
          )
        );
      }
    }
    catch (err) {
      console.error("Send message failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    }
  };

  // ---------- Handle Tip ----------
  const handleTip = async (amount: string) => {
    if (!currentProfileId || !recipientId) return;

    const tipPayload: Database["public"]["Tables"]["messages"]["Insert"] = {
      conversation_id: [currentProfileId, recipientId].sort().join("_"),
      text: `Sent a $${amount} tip`,
      sender_id: currentProfileId,
      recipient_id: recipientId,
      type: "tip",
      is_read: false,
    };

    const tempTip: Message = {
      id: Date.now().toString(),
      text: tipPayload.text,
      sender: "user",
      timestamp: new Date(),
      type: "tip",
    };
    setMessages((prev) => [...prev, tempTip]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([tipPayload])
        .select()
        .single();

      if (error) console.error("Error sending tip:", error);
    } catch (err) {
      console.error("Tip failed:", err);
    }

    // Optional: creator auto response (temporary)
    setTimeout(() => {
      const thankYou: Message = {
        id: (Date.now() + 1).toString(),
        text: `OMG thank you so much for the $${amount} tip! You're incredible! 😘💕`,
        sender: "creator",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, thankYou]);
    }, 1000);
  };

  // ---------- Format Time ----------
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ---------- UI (unchanged) ----------
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 h-screen flex flex-col">
        {/* Chat Header */}
        <div className="glass-card border-b border-border/50 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
                <Link to={`/profile/${recipientId}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                {profile && (
                  <div className="relative">
                    <img
                      src={profile.profile_image || "/placeholder.svg"}
                      alt={profile.display_name || "User"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {profile.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{profile?.display_name || "User"}</h3>
                  <Badge variant="secondary" className={`${profile?.is_online ? "bg-green-500/20 text-green-400" : "bg-muted/50"} border-none text-xs`}>
                    {profile?.is_online ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${message.sender === "user" ? message.type === "tip" ? "gradient-secondary text-white" : "gradient-primary text-white" : "glass-card text-foreground"} ${message.type === "tip" ? "neon-glow" : ""}`}>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className={`text-xs mt-2 ${message.sender === "user" ? "gradient-primary" : "text-muted-foreground"}`}>
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
              <Button onClick={() => handleTip("5")} variant="outline" size="sm" className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth">
                <Gift className="w-4 h-4 mr-1" />
                Tip $5
              </Button>
              <Button onClick={() => handleTip("10")} variant="outline" size="sm" className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth">
                <Gift className="w-4 h-4 mr-1" />
                Tip $10
              </Button>
              <Button onClick={() => handleTip("25")} variant="outline" size="sm" className="bg-muted/50 border-border/50 hover:bg-muted transition-smooth">
                <Gift className="w-4 h-4 mr-1" />
                Tip $25
              </Button>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="glass-card border-t border-border/50 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            {profile && !profile.is_online && (
              <div className="mb-3 p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  This creator is currently offline. They'll see your message when they return.
                </p>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-muted/50 transition-smooth"
                  disabled={!profile?.is_online}
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-muted/50 transition-smooth"
                  disabled={!profile?.is_online}
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>

              <Input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder={profile?.is_online ? "Type a message..." : "Creator is offline..."} 
                className="flex-1 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                disabled={!profile?.is_online}
              />

              <Button 
                type="submit" 
                disabled={!newMessage.trim() || !profile?.is_online} 
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
