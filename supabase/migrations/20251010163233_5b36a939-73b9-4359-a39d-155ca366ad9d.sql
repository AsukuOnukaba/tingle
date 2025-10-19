-- Update uploads bucket to allow PDFs and other file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
]
WHERE id = 'uploads';