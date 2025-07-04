import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeWorker } from 'https://esm.sh/@pgflow/worker@latest';
import Groq from 'https://esm.sh/groq-sdk@0.5.0';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
	// Handle CORS
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
	const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
	const groqApiKey = Deno.env.get('GROQ_API_KEY')!;

	const supabase = createClient(supabaseUrl, supabaseServiceKey);
	const groq = new Groq({ apiKey: groqApiKey });

	const worker = new EdgeWorker({
		supabaseUrl,
		supabaseServiceKey,
		flowSlug: 'transcribe-voice-memo',
		options: {
			taskHandlers: {
				'download-audio': async ({ input }) => {
					const { storage_path } = input.run;

					try {
						// Download the audio file from storage
						const { data, error } = await supabase.storage
							.from('voice-memos')
							.download(storage_path);

						if (error) throw error;

						// Convert blob to base64 for passing to next step
						const arrayBuffer = await data.arrayBuffer();
						const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

						return {
							storage_path,
							audio_base64: base64Audio,
							mime_type: data.type || 'audio/webm'
						};
					} catch (error) {
						throw new Error(`Failed to download audio: ${error.message}`);
					}
				},

				'transcribe-audio': async ({ input }) => {
					const { storage_path, audio_base64, mime_type } = input['download-audio'];

					try {
						// Convert base64 back to File for Groq API
						const audioBuffer = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
						const audioFile = new File([audioBuffer], 'audio.webm', { type: mime_type });

						// Transcribe using Groq Whisper API
						const transcription = await groq.audio.transcriptions.create({
							file: audioFile,
							model: 'whisper-large-v3',
							response_format: 'verbose_json',
							language: 'en' // You can make this dynamic based on user preferences
						});

						return {
							storage_path,
							transcription_text: transcription.text,
							language: transcription.language,
							duration: transcription.duration,
							segments: transcription.segments
						};
					} catch (error) {
						throw new Error(`Failed to transcribe audio: ${error.message}`);
					}
				},

				'save-transcription': async ({ input }) => {
					const { storage_path } = input.run;
					const { user_id } = input.run;
					const { transcription_text, language, duration, segments } = input['transcribe-audio'];

					try {
						// Save transcription to database
						const { data, error } = await supabase
							.from('transcriptions')
							.upsert(
								{
									user_id,
									storage_path,
									transcription_text,
									language,
									processed_at: new Date().toISOString(),
									metadata: {
										duration,
										segments_count: segments?.length || 0,
										segments: segments?.slice(0, 5) // Store first 5 segments for reference
									}
								},
								{
									onConflict: 'storage_path'
								}
							)
							.select()
							.single();

						if (error) throw error;

						return {
							transcription_id: data.id,
							storage_path,
							status: 'completed'
						};
					} catch (error) {
						// Update transcription record with error
						await supabase
							.from('transcriptions')
							.update({
								error: error.message,
								processed_at: new Date().toISOString()
							})
							.eq('storage_path', storage_path);

						throw new Error(`Failed to save transcription: ${error.message}`);
					}
				}
			}
		}
	});

	return worker.serve(req);
});
