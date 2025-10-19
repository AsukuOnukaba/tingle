-- 2025-10-17 09:00:00 UTC - create messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid,
  sender_id uuid not null,        -- the user who sent the message
  recipient_id uuid not null,     -- the recipient user (creator or subscriber)
  creator_id uuid,                -- the creator (optional redundancy)
  text text not null,
  type text default 'text',       -- 'text' | 'tip' | 'unlock' | 'template'
  metadata jsonb default '{}'::jsonb, -- ext. metadata (amount, tip info, etc.)
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes to make lookups faster
create index if not exists messages_conversation_idx on public.messages (conversation_id);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists messages_recipient_idx on public.messages (recipient_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);
