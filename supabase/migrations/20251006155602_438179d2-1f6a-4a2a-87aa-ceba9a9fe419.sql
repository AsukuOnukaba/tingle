-- Create creators table for creator applications
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  application_note TEXT,
  pending_balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create media table for uploaded content
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create media purchases table to track who bought what
CREATE TABLE public.media_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_paid NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(media_id, buyer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creators table
CREATE POLICY "Anyone can view approved creators"
  ON public.creators FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view own creator profile"
  ON public.creators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own creator application"
  ON public.creators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creator profile"
  ON public.creators FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all creators"
  ON public.creators FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for media table
CREATE POLICY "Anyone can view approved media"
  ON public.media FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Creators can insert own media"
  ON public.media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE id = media.creator_id AND user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Creators can update own media"
  ON public.media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE id = media.creator_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete own media"
  ON public.media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE id = media.creator_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all media"
  ON public.media FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for media_purchases
CREATE POLICY "Users can view own purchases"
  ON public.media_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Creators can view their media purchases"
  ON public.media_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.media m
      JOIN public.creators c ON m.creator_id = c.id
      WHERE m.id = media_purchases.media_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own purchases"
  ON public.media_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all purchases"
  ON public.media_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('media-content', 'media-content', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('media-thumbnails', 'media-thumbnails', true);

-- Storage policies for media-content (private)
CREATE POLICY "Creators can upload their content"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-content' AND
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Creators can view their own content"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media-content' AND
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view purchased content"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media-content' AND
    EXISTS (
      SELECT 1 FROM public.media_purchases mp
      JOIN public.media m ON mp.media_id = m.id
      WHERE mp.buyer_id = auth.uid() AND m.file_url LIKE '%' || storage.objects.name || '%'
    )
  );

CREATE POLICY "Admins can manage media content"
  ON storage.objects FOR ALL
  USING (bucket_id = 'media-content' AND has_role(auth.uid(), 'admin'));

-- Storage policies for media-thumbnails (public)
CREATE POLICY "Creators can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-thumbnails');

CREATE POLICY "Creators can update their thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media-thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage thumbnails"
  ON storage.objects FOR ALL
  USING (bucket_id = 'media-thumbnails' AND has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on creators
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on media
CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();