import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Gift, Image, Smile, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { getProfile } from "@/lib/profileData";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { supabase } from './../integrations/supabase/client.ts';
import { Button } from './../integrations/components/ui/button.tsx';
import { Database } from './../lib/database.types.ts';

// fixed import: don't include file extension and ensure file exists

interface Message {
  id: string;
  text: string;
  sender: "user" | "creator";
  timestamp: Date;
  type?: "text" | "tip" | "unlock";
}

type DBMessage = Database["public"]["Tables"]["messages"]["Row"];
type TablesInsert = Database["public"]["Tables"];


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
  const { id: paramId } = useParams();
  const { currentProfileId } = useCurrentProfile();
  const profileId = paramId || currentProfileId || "1";
  const profile = getProfile(Number(profileId));
  const { recipientId } = useParams<{ recipientId: string }>();
  const conversationId = [currentProfileId, recipientId].sort().join("_");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---------- Scroll to Bottom ----------
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ---------- Fetch Messages ----------
  // Create a typed helper function
  useEffect(() => {
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          // use DB column names; select only what you need or use "*"
          .select("id, conversation_id, sender_id, recipient_id, text, type, created_at")
          .eq("conversation_id", String(profileId))
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }

        if (data && !cancelled) {
          // data is inferred from typed client as DBMessage[] | null
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
  }, [profileId]);

  // ---------- Subscribe to Real-time Messages ----------
  useEffect(() => {
    if (!profileId) return;

    // const isNumeric = /^\d+$/.test(String(profileId));
    const conversationId = [currentProfileId, recipientId].sort().join("_");
    const filterVal = conversationId;


    // const channelName = `chat_${profileId}`;
    const channel = supabase
      .channel(`chat_${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${filterVal}` },
        (payload) => {
          const newMsg = payload.new as DBMessage;
          if (!newMsg) return;
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

      .subscribe((status) => {
        console.debug("Realtime subscribe status:", status);
      });

    return () => {
      try {
        channel.unsubscribe().catch(() => { });
        // supabase.removeChannel may or may not be available depending on client version
        try { supabase.removeChannel(channel); } catch { }
      } catch (e) {
        console.error("Error cleaning up channel:", e);
      }
    };
  }, [profileId]);

  // ---------- Send Message ----------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messagePayload = {
      conversation_id: profileId, // or whatever your conversation reference is
      sender_id: currentProfileId,
      recipient_id: recipientId,
      text: newMessage,
      type: "text",
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: null,
      creator_id: null, // if optional
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
    const tipPayload: Database["public"]["Tables"]["messages"]["Insert"] = {
      conversation_id: profileId, // instead of chat_id
      text: newMessage,
      sender_id: currentProfileId, // instead of sender
      recipient_id: recipientId, // required field
      type: "tip",
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: null,
      creator_id: null, // optional
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
                <Link to={`/profile/${profileId}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                {profile && (
                  <div className="relative">
                    <img
                      src={profile.image}
                      alt={profile.name || "User"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {profile.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{profile.name}</h3>
                  <Badge variant="secondary" className={`${profile.isOnline ? "bg-green-500/20 text-green-400" : "bg-muted/50"} border-none text-xs`}>
                    {profile.isOnline ? "Online" : "Offline"}
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
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <div className="flex space-x-2">
                <Button type="button" variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
                  <Image className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="hover:bg-muted/50 transition-smooth">
                  <Smile className="w-4 h-4" />
                </Button>
              </div>

              <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-muted/50 border-border/50 focus:border-primary transition-smooth" />

              <Button type="submit" disabled={!newMessage.trim()} className="gradient-primary hover:opacity-90 transition-smooth neon-glow">
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
