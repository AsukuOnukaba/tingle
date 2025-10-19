-- Create uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own uploads" ON storage.objects;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Create policy to allow public to view uploaded files
CREATE POLICY "Allow public to view uploaded files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Create policy to allow users to update their own uploads
CREATE POLICY "Allow users to update their own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own uploads
CREATE POLICY "Allow users to delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);