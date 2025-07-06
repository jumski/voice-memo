import { Flow } from '@pgflow/dsl';
import downloadStorageFile from '../_tasks/downloadStorageFile.ts';
import transcribeAudioFile from '../_tasks/transcribeAudioFile.ts';

type Input = {
	storage_path: string;
	user_id: string;
};

export const ProcessVoiceMemo = new Flow<Input>({
	slug: 'processVoiceMemo'
})
	.step({ slug: 'transcription' }, async ({ run }) => {
		// Download and transcribe in one step
		const { storage_path } = run;

		// Download the audio file from storage
		const audioBuffer = await downloadStorageFile(storage_path);

		// Extract filename from storage path for format detection
		const filename = storage_path.split('/').pop() || 'audio.wav';

		// Transcribe the audio
		const transcription = await transcribeAudioFile(audioBuffer, filename, {
			language: 'en' // Default to English, could be made configurable
		});

		return {
			text: transcription.text,
			language: transcription.language,
			duration: transcription.duration,
			storage_path
		};
	})
	.step(
		{
			slug: 'saveTranscription',
			dependsOn: ['transcription']
		},
		async ({ run, transcription }) => {
			// Save transcription to database
			const { user_id } = run;

			// This would typically save to a database table
			// For now, we'll just return the data structure
			return {
				user_id,
				storage_path: run.storage_path,
				transcription_text: transcription.text,
				language: transcription.language,
				duration: transcription.duration,
				created_at: new Date().toISOString()
			};
		}
	);
