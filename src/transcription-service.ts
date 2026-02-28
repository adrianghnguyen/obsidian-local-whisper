import {pipeline} from '@huggingface/transformers';
import {Notice} from 'obsidian';

export enum ModelStatus {
	NOT_LOADED = 'not_loaded',
	DOWNLOADING = 'downloading',
	READY = 'ready',
	ERROR = 'error',
}

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

export interface ProgressInfo {
	status: ModelStatus;
	progress: number;
	message?: string;
}

export class TranscriptionService {
	private transcriber: TranscriberPipeline | null = null;
	private isInitializing = false;
	private modelName: string;
	private status: ModelStatus = ModelStatus.NOT_LOADED;
	private progress = 0;
	private progressCallback?: (info: ProgressInfo) => void;

	constructor(modelName: string) {
		this.modelName = modelName;
	}

	getStatus(): ModelStatus {
		return this.status;
	}

	getProgress(): number {
		return this.progress;
	}

	setProgressCallback(callback: ((info: ProgressInfo) => void) | undefined): void {
		this.progressCallback = callback;
	}

	private updateStatus(status: ModelStatus, progress?: number, message?: string): void {
		this.status = status;
		if (progress !== undefined) {
			this.progress = progress;
		}
		if (this.progressCallback) {
			this.progressCallback({
				status: this.status,
				progress: this.progress,
				message,
			});
		}
	}

	async initialize(): Promise<void> {
		if (this.transcriber || this.isInitializing) {
			return;
		}

		this.isInitializing = true;
		this.updateStatus(ModelStatus.DOWNLOADING, 0, 'Initializing model...');

		try {
			new Notice('Loading transcription model - this may take a moment on first use');
			
			const model = await pipeline(
				'automatic-speech-recognition',
				this.modelName,
				{
					progress_callback: (info: { status: string; progress?: number; file?: string }) => {
						if (info.progress !== undefined) {
							const progressPercent = Math.round(info.progress * 100);
							this.updateStatus(
								ModelStatus.DOWNLOADING,
								progressPercent,
								info.file ? `Downloading ${info.file}` : 'Downloading...'
							);
						}
					},
				}
			);
			this.transcriber = model as unknown as TranscriberPipeline;
			
			this.updateStatus(ModelStatus.READY, 100, 'Model ready');
			new Notice('Transcription model loaded');
		} catch (error) {
			this.updateStatus(ModelStatus.ERROR, 0, 'Failed to load model');
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
		this.status = ModelStatus.NOT_LOADED;
		this.progress = 0;
		this.isInitializing = false;
	}

	dispose() {
		this.transcriber = null;
		this.status = ModelStatus.NOT_LOADED;
		this.progress = 0;
		this.isInitializing = false;
		this.progressCallback = undefined;
	}
}
