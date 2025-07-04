-- Create transcriptions table
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in storage bucket (e.g., 'user_id/timestamp.webm')
  transcription_text TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data from Groq API response
  
  -- Ensure unique transcription per audio file
  UNIQUE(storage_path)
);

-- Create indexes
CREATE INDEX idx_transcriptions_user_id ON public.transcriptions(user_id);
CREATE INDEX idx_transcriptions_created_at ON public.transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_storage_path ON public.transcriptions(storage_path);
CREATE INDEX idx_transcriptions_unprocessed ON public.transcriptions(processed_at) WHERE processed_at IS NULL;

-- Enable RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transcriptions"
  ON public.transcriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transcriptions"
  ON public.transcriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcriptions"
  ON public.transcriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcriptions"
  ON public.transcriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE public.transcriptions IS 'Stores transcriptions of voice memos';
COMMENT ON COLUMN public.transcriptions.storage_path IS 'Path to audio file in voice-memos bucket';
COMMENT ON COLUMN public.transcriptions.transcription_text IS 'Transcribed text from Groq Whisper API';
COMMENT ON COLUMN public.transcriptions.processed_at IS 'When transcription was completed';
COMMENT ON COLUMN public.transcriptions.error IS 'Error message if transcription failed';
COMMENT ON COLUMN public.transcriptions.metadata IS 'Additional metadata from Groq API response (e.g., confidence scores)';