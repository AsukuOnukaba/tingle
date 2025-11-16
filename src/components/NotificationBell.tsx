import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadMessageCount();
      subscribeToNotifications();
      subscribeToMessages();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications((data as any) || []);
      setUnreadCount(((data as any) || []).filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Fetch unread message count
  const fetchUnreadMessageCount = async () => {
    try {
      const { data, error } = await supabase
        .from("messages" as any)
        .select("id, sender_id", { count: 'exact' })
        .eq("recipient_id", user?.id)
        .eq("is_read", false);

      if (error) throw error;
      
      // Count unique senders
      const uniqueSenders = new Set((data || []).map((m: any) => m.sender_id));
      const messageCount = uniqueSenders.size;
      
      // Add to notification count
      const notifCount = notifications.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(notifCount + messageCount);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("message_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadMessageCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadMessageCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("id", notificationId);

      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-4 cursor-pointer"
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between w-full mb-1">
                  <span className="font-medium text-sm">{notification.title}</span>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {notification.message}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
