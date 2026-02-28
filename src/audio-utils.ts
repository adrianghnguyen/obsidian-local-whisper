export async function convertAudioToFloat32(audioBlob: Blob): Promise<Float32Array> {
	const audioContext = new AudioContext({sampleRate: 16000});
	const arrayBuffer = await audioBlob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
	
	let audio: Float32Array;
	if (audioBuffer.numberOfChannels === 2) {
		const left = audioBuffer.getChannelData(0);
		const right = audioBuffer.getChannelData(1);
		audio = new Float32Array(left.length);
		for (let i = 0; i < left.length; i++) {
			audio[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
		}
	} else {
		audio = audioBuffer.getChannelData(0);
	}
	
	await audioContext.close();
	return audio;
}

export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}
