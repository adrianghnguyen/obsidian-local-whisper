import {pipeline} from '@huggingface/transformers';
import {Notice} from 'obsidian';

type TranscriberPipeline = (
	audio: Float32Array,
	options?: TranscriptionOptions
) => Promise<TranscriptionResult>;

interface TranscriptionOptions {
	chunk_length_s?: number;
	stride_length_s?: number;
	language?: string;
}

interface TranscriptionResult {
	text: string;
}

export class TranscriptionService {
	private transcriber: TranscriberPipeline | null = null;
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
			new Notice('Loading transcription model - this may take a moment on first use');
			
			const model = await pipeline(
				'automatic-speech-recognition',
				this.modelName
			);
			this.transcriber = model as unknown as TranscriberPipeline;
			
			new Notice('Transcription model loaded');
		} catch (error) {
			new Notice('Failed to load transcription model - check console for details');
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
			const options: TranscriptionOptions = {
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
