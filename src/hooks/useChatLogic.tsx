// src/hooks/useChatLogic.ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Database } from './../lib/database.types.ts';

/**
 * Chat message shape used within the UI code (keeps it independent from DB-generated types).
 */
export type ChatMessage = {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  recipient_id: string;
  creator_id?: string | null;
  text: string;
  type?: string;
  metadata?: Record<string, any>;
  is_read?: boolean;
  created_at: string;
};

type UseChatLogicReturn = {
  messages: ChatMessage[];
  loading: boolean;
  newMessage: string;
  setNewMessage: (v: string) => void;
  sendMessage: (e?: React.FormEvent) => Promise<void>;
  listRef: React.RefObject<HTMLDivElement>;
};

/**
 * Hook that encapsulates all chat logic. Pass a creatorId (string or undefined).
 * It defensively extracts a current user id from useCurrentProfile() (works with a few shapes).
 */
export default function useChatLogic(creatorId?: string | undefined): UseChatLogicReturn {
  // Defensive extraction of the current user's id from the project's custom hook
  const rawProfile = useCurrentProfile();
  const profileObj: any =
    rawProfile && (rawProfile as any).profile
      ? (rawProfile as any).profile
      : rawProfile && (rawProfile as any).data
      ? (rawProfile as any).data
      : rawProfile;
  const currentUserId = profileObj && (profileObj.id || profileObj.user_id || profileObj.sub)
    ? String(profileObj.id ?? profileObj.user_id ?? profileObj.sub)
    : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Guard: only run when both creatorId and currentUserId exist
    if (!creatorId || !currentUserId) return;

    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        // Build the or() filter string for two-way conversation
        // If either id contains non-alphanumeric characters, PostgREST expects them as-is; using template is okay
        const orFilter = `and(sender_id.eq.${currentUserId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${currentUserId})`;

        // Avoid TypeScript overloads: capture result as any then cast
        const res: any = await supabase
          .from('messages')
          .select("*")
          .or(orFilter)
          .order("created_at", { ascending: true })
          .limit(500);

        if (!mounted) return;

        const err = res?.error;
        const data = res?.data as ChatMessage[] | null;

        if (err) {
          console.error("Supabase load error (messages):", err);
          setMessages([]);
        } else if (data && Array.isArray(data)) {
          setMessages(data);
          // small timeout to let DOM render before scrolling
          setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("Unexpected error loading messages:", e);
        setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // Subscribe to realtime inserts on messages table
    const channelName = `public:messages:chat:${creatorId}:${currentUserId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          try {
            const newRow = payload?.new as ChatMessage | undefined;
            if (!newRow) return;

            // Only append if part of this two-person conversation
            const isPartOfConversation =
              (newRow.sender_id === currentUserId && newRow.recipient_id === creatorId) ||
              (newRow.sender_id === creatorId && newRow.recipient_id === currentUserId);

            if (isPartOfConversation) {
              setMessages((prev) => [...prev, newRow]);
              setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
            }
          } catch (e) {
            console.error("Error handling realtime payload:", e);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      // safe unsubscribe
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore if channel already removed or method not available
      }
    };
  }, [creatorId, currentUserId]);

  // sendMessage handles optimistic UI and safe replacement of the optimistic message
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !currentUserId || !creatorId) return;

    const payload = {
      sender_id: currentUserId,
      recipient_id: creatorId,
      creator_id: creatorId,
      text: newMessage.trim(),
      type: "text",
      metadata: {},
    };

    // optimistic message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      sender_id: payload.sender_id,
      recipient_id: payload.recipient_id,
      creator_id: payload.creator_id,
      text: payload.text,
      type: payload.type,
      metadata: payload.metadata,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);

    try {
      // Use array insert to avoid TS overloads and request the inserted rows
      const res: any = await supabase.from("messages").insert([payload]).select("*");
      const err = res?.error;
      const data = res?.data as ChatMessage[] | null;

      if (err) {
        console.error("Supabase insert error (messages):", err);
        // Optionally mark the optimistic message as failed or remove it.
        // For now, we'll leave it and log the error.
        return;
      }

      const inserted = Array.isArray(data) ? data[0] : (data as any);
      if (inserted) {
        // replace optimistic message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? inserted : m)));
      }
    } catch (ex) {
      console.error("Unexpected error sending message:", ex);
      // leave optimistic message or show error UI
    }
  };

  return {
    messages,
    loading,
    newMessage,
    setNewMessage,
    sendMessage,
    listRef,
  };
}
