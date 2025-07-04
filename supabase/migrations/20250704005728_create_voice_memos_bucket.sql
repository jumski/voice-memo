-- Create voice-memos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-memos',
  'voice-memos', 
  false,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
);

-- Create RLS policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own voice memos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-memos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy to allow users to view their own files
CREATE POLICY "Users can view their own voice memos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-memos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy to allow users to delete their own voice memos
CREATE POLICY "Users can delete their own voice memos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-memos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);