import Groq from 'npm:groq-sdk@0.7.0';

/**
 * Transcribes an audio file using Groq's Whisper API
 *
 * @param audioBuffer - The audio file as a Buffer/Uint8Array
 * @param filename - The original filename (used for format detection)
 * @param options - Optional transcription parameters
 * @returns Transcribed text and metadata
 */
export default async function transcribeAudioFile(
	audioBuffer: Buffer | Uint8Array,
	filename: string,
	options?: {
		language?: string;
		prompt?: string;
		temperature?: number;
	}
): Promise<{
	text: string;
	language?: string;
	duration?: number;
}> {
	console.log(`Transcribing audio file: ${filename} (${audioBuffer.length} bytes)`);

	// Initialize Groq client
	const groq = new Groq({
		apiKey: Deno.env.get('GROQ_API_KEY')!
	});

	try {
		// Create a File object from the buffer
		// Groq SDK expects a File-like object
		const file = new File([audioBuffer], filename, {
			type: getMimeType(filename)
		});

		// Transcribe the audio
		const transcription = await groq.audio.transcriptions.create({
			file: file,
			model: 'whisper-large-v3', // Fast and accurate
			language: options?.language,
			prompt: options?.prompt,
			temperature: options?.temperature ?? 0.0, // Default to deterministic
			response_format: 'json'
		});

		console.log(`Transcription complete: ${transcription.text.length} characters`);

		return {
			text: transcription.text,
			language: transcription.language,
			duration: transcription.duration
		};
	} catch (error) {
		console.error('Transcription failed:', error);
		throw new Error(`Failed to transcribe audio: ${error.message}`);
	}
}

/**
 * Helper function to determine MIME type from filename
 */
function getMimeType(filename: string): string {
	const ext = filename.toLowerCase().split('.').pop();
	const mimeTypes: Record<string, string> = {
		mp3: 'audio/mpeg',
		mp4: 'audio/mp4',
		mpeg: 'audio/mpeg',
		mpga: 'audio/mpeg',
		m4a: 'audio/mp4',
		wav: 'audio/wav',
		webm: 'audio/webm',
		ogg: 'audio/ogg',
		flac: 'audio/flac'
	};

	return mimeTypes[ext || ''] || 'audio/mpeg';
}
