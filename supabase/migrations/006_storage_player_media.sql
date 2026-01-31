-- Create player-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-media', 'player-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'player-media');

-- Allow authenticated users to read media
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'player-media');

-- Allow authenticated users to delete their uploaded media
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'player-media');
