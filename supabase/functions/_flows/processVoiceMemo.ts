import { Flow } from '@pgflow/dsl';

type Input = {
	storage_path: string;
	user_id: string;
};

export const ProcessVoiceMemo = new Flow<Input>({
	slug: 'processVoiceMemo'
})
	.step({ slug: 'transcription' }, async ({ run }) => {
		const { storage_path } = run;
		console.log(storage_path);
		return {};
	})
	.step(
		{
			slug: 'transcription',
			dependsOn: ['download-audio']
		},
		async ({ run }) => {
			// Transcribe using Groq API
			const { storage_path } = run;
			console.log(storage_path);

			// This will be handled by the Edge Function
			return {
				storage_path,
				status: 'ready_for_transcription'
			};
		}
	)
	.step(
		{
			slug: 'saveTranscription',
			dependsOn: ['transcription']
		},
		async ({ run }) => {
			// Save transcription to database
			const { storage_path } = run;

			return {
				storage_path,
				status: 'ready_to_save'
			};
		}
	);
