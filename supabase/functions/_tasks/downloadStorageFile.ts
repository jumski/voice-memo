import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Downloads a file from Supabase Storage
 *
 * @param storagePath - The full storage path in format "bucket/path/to/file.ext"
 * @param supabaseUrl - Optional Supabase URL (defaults to env variable)
 * @param supabaseKey - Optional Supabase service key (defaults to env variable)
 * @returns Buffer containing the file data
 */
export default async function downloadStorageFile(
	storagePath: string,
	supabaseUrl?: string,
	supabaseKey?: string
): Promise<Buffer> {
	// Parse bucket and file path
	const pathParts = storagePath.split('/');
	if (pathParts.length < 2) {
		throw new Error('Invalid storage path. Expected format: bucket/path/to/file');
	}

	const bucketName = pathParts[0];
	const filePath = pathParts.slice(1).join('/');

	console.log(`Downloading file from bucket: ${bucketName}, path: ${filePath}`);

	// Initialize Supabase client
	const supabase = createClient(
		supabaseUrl || Deno.env.get('SUPABASE_URL')!,
		supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	);

	try {
		// Download the file
		const { data, error } = await supabase.storage.from(bucketName).download(filePath);

		if (error) {
			console.error('Storage download error:', error);
			throw new Error(`Failed to download file: ${error.message}`);
		}

		if (!data) {
			throw new Error('No data returned from storage');
		}

		// Convert Blob to Buffer for easier handling
		const arrayBuffer = await data.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		console.log(`Successfully downloaded file: ${buffer.length} bytes`);

		return buffer as Buffer;
	} catch (error) {
		console.error('Download failed:', error);
		throw error;
	}
}
