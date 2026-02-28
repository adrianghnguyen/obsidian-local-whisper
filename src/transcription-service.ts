import {pipeline} from '@huggingface/transformers';
import {Notice} from 'obsidian';

export class TranscriptionService {
	private transcriber: any = null;
	private isInitializing = false;
	private modelName: string;

	constructor(modelName: string) {
		this.modelName = modelName;
	}

	async initialize(): Promise<void> {
		if (this.transcriber || this.isInitializing) {
			return;
		}

		this.isInitializing = true;

		try {
			new Notice('Loading Whisper model... This may take a moment on first use.');
			
			this.transcriber = await pipeline(
				'automatic-speech-recognition',
				this.modelName
			);
			
			new Notice('Whisper model loaded successfully!');
		} catch (error) {
			new Notice('Failed to load Whisper model. Check console for details.');
			console.error('Model loading error:', error);
			throw error;
		} finally {
			this.isInitializing = false;
		}
	}

	async transcribe(audio: Float32Array, language?: string): Promise<string> {
		if (!this.transcriber) {
			await this.initialize();
		}

		if (!this.transcriber) {
			throw new Error('Transcriber not initialized');
		}

		try {
			const options: any = {
				chunk_length_s: 30,
				stride_length_s: 5,
			};

			if (language && language !== 'english') {
				options.language = language;
			}

			const result = await this.transcriber(audio, options);
			
			if (result && typeof result.text === 'string') {
				return result.text.trim();
			}
			
			throw new Error('Invalid transcription result');
		} catch (error) {
			console.error('Transcription error:', error);
			throw error;
		}
	}

	updateModel(modelName: string) {
		this.modelName = modelName;
		this.transcriber = null;
	}

	dispose() {
		this.transcriber = null;
	}
}
