import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, User, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChatWindow from "@/components/chat/ChatWindow";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

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

const Messages = () => {
  const { recipientId } = useParams<{ recipientId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (!recipientId || !user) return;

    // Subscribe to new messages to update conversation list
    const channel = supabase
      .channel('messages_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Fetch messages without foreign key joins
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      messages?.forEach((msg: any) => {
        const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
        userIds.add(otherUserId);
      });

      // Fetch profiles for all users in conversations
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, profile_image, is_online")
        .in("id", Array.from(userIds));

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((msg: any) => {
        const isReceiver = msg.recipient_id === user?.id;
        const otherUserId = isReceiver ? msg.sender_id : msg.recipient_id;
        const otherUser = profileMap.get(otherUserId) as any;

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

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, profile_image, is_online")
        .neq("id", user?.id || "")
        .limit(50);

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleStartChat = () => {
    setShowUserList(true);
    fetchAllUsers();
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

      <div className="pt-16 h-screen flex">
        {/* Left Sidebar - Conversations List */}
        <div className="w-full md:w-96 border-r border-border/50 flex flex-col bg-background">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Messages
            </h2>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50"
              />
            </div>
          </div>

          {/* Conversations or User List */}
          <div className="flex-1 overflow-y-auto">
            {showUserList ? (
              <div>
                <div className="p-4 border-b border-border/50 flex items-center justify-between">
                  <h3 className="font-semibold">Start a new chat</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserList(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3"
                      onClick={() => {
                        navigate(`/messages/${user.id}`);
                        setShowUserList(false);
                      }}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.profile_image} />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        {user.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.is_online ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Start chatting with other users
                </p>
                <Button onClick={handleStartChat} className="gradient-primary">
                  Start a Chat
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors border-l-2 ${
                      recipientId === conv.recipientId
                        ? "border-primary bg-muted/30"
                        : "border-transparent"
                    }`}
                    onClick={() => navigate(`/messages/${conv.recipientId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={conv.recipientImage} />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        {conv.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

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
                            <Badge className="ml-2 gradient-primary neon-glow text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Start New Chat Button at bottom */}
                <div className="p-4">
                  <Button
                    onClick={handleStartChat}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 hidden md:flex">
          {recipientId ? (
            <ChatWindow recipientId={recipientId} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageCircle className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
