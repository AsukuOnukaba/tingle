import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Conversation {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

const ChatList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to new messages for real-time conversation updates
      const messagesChannel = supabase
        .channel('chat_list_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            // Refetch conversations when new message arrives
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${user.id}`
          },
          () => {
            // Refetch conversations when user sends new message
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            // Update when message read status changes
            fetchConversations();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Get all unique conversations
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, display_name, profile_image, is_online),
          recipient:profiles!messages_recipient_id_fkey(id, display_name, profile_image, is_online)
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((msg: any) => {
        const isReceiver = msg.recipient_id === user?.id;
        const otherUserId = isReceiver ? msg.sender_id : msg.recipient_id;
        const otherUser = isReceiver ? msg.sender : msg.recipient;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: msg.conversation_id || otherUserId,
            recipientId: otherUserId,
            recipientName: otherUser?.display_name || "Unknown User",
            recipientImage: otherUser?.profile_image || "",
            lastMessage: msg.text,
            lastMessageTime: msg.created_at,
            unreadCount: isReceiver && !msg.is_read ? 1 : 0,
            isOnline: otherUser?.is_online || false,
          });
        } else {
          // Update unread count
          const conv = conversationMap.get(otherUserId)!;
          if (isReceiver && !msg.is_read) {
            conv.unreadCount += 1;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Messages
            </h1>
            <p className="text-muted-foreground">
              Your conversations with creators
            </p>
          </div>

          {/* Search */}
          <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <Card className="glass-card animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Start chatting to connect with others!
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredConversations.map((conv, index) => (
                <Card
                  key={conv.id}
                  className="glass-card hover-scale cursor-pointer transition-smooth animate-fade-up"
                  style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                  onClick={() => navigate(`/chat/${conv.recipientId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="w-14 h-14 border-2 border-primary">
                          <AvatarImage src={conv.recipientImage} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="w-6 h-6 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        {conv.isOnline && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">
                            {conv.recipientName}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="ml-2 gradient-primary neon-glow">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
