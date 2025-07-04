<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let recording = $state(false);
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let pulseInterval: ReturnType<typeof setInterval> | null = null;
	let circleScale = $state(1);
	let recordingTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let uploading = $state(false);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	async function toggleRecording() {
		if (!recording) {
			// Start recording
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				mediaRecorder = new MediaRecorder(stream);
				audioChunks = [];

				mediaRecorder.ondataavailable = (event) => {
					audioChunks.push(event.data);
				};

				mediaRecorder.onstop = async () => {
					const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

					// Upload to Supabase Storage
					uploading = true;
					try {
						const supabase = $page.data.supabase;
						const user = $page.data.user;

						if (!user) {
							console.error('User not authenticated');
							return;
						}

						const fileName = `${user.id}/${Date.now()}.webm`;

						const { data, error } = await supabase.storage
							.from('voice-memos')
							.upload(fileName, audioBlob, {
								contentType: 'audio/webm',
								cacheControl: '3600',
								upsert: false
							});

						if (error) {
							console.error('Upload error:', error);
							if (error.message === 'Bucket not found') {
								alert('Please create a "voice-memos" bucket in Supabase Storage');
							}
						} else {
							console.log('Upload successful:', data);
						}
					} catch (err) {
						console.error('Error uploading:', err);
					} finally {
						uploading = false;
					}

					// Stop all tracks
					stream.getTracks().forEach((track) => track.stop());
				};

				mediaRecorder.start();
				recording = true;

				// Start pulsing animation
				circleScale = 200 / 144;
				let growing = false;
				pulseInterval = setInterval(() => {
					if (growing) {
						circleScale = 200 / 144;
					} else {
						circleScale = 170 / 144;
					}
					growing = !growing;
				}, 800);

				// Start timer
				recordingTime = 0;
				timerInterval = setInterval(() => {
					recordingTime++;
				}, 1000);
			} catch (err) {
				console.error('Error accessing microphone:', err);
			}
		} else {
			// Stop recording
			if (mediaRecorder && mediaRecorder.state !== 'inactive') {
				mediaRecorder.stop();
			}
			recording = false;

			// Stop pulsing
			if (pulseInterval) {
				clearInterval(pulseInterval);
				pulseInterval = null;
			}
			circleScale = 1;

			// Stop timer
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
			recordingTime = 0;
		}
	}

	onMount(() => {
		return () => {
			// Cleanup on unmount
			if (pulseInterval) {
				clearInterval(pulseInterval);
			}
			if (timerInterval) {
				clearInterval(timerInterval);
			}
			if (mediaRecorder && mediaRecorder.state !== 'inactive') {
				mediaRecorder.stop();
			}
		};
	});
</script>

<div class="screen" onclick={toggleRecording}>
	<div class="circle" style="transform: scale({circleScale})">
		{#if recording}
			<span class="timer">{formatTime(recordingTime)}</span>
		{:else if uploading}
			<span class="timer">Uploading...</span>
		{/if}
	</div>
</div>

<style>
	.screen {
		position: fixed;
		inset: 0;
		background-color: #1a1b26;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.circle {
		width: 144px;
		height: 144px;
		background-color: #ff0033;
		border-radius: 50%;
		transition: transform 800ms ease-in-out;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.timer {
		color: white;
		font-size: 24px;
		font-weight: bold;
		font-family: monospace;
	}
</style>
