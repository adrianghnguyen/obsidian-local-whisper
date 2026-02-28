import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TranscriptionService, ModelStatus } from './transcription-service';
import { mockPipeline } from './__mocks__/transformers';

vi.mock('@huggingface/transformers');
vi.mock('obsidian');

describe('TranscriptionService', () => {
	let service: TranscriptionService;
	
	beforeEach(() => {
		vi.clearAllMocks();
		service = new TranscriptionService('Xenova/whisper-tiny.en');
	});
	
	afterEach(() => {
		service.dispose();
	});
	
	describe('Status Management', () => {
		it('should have initial status as NOT_LOADED', () => {
			expect(service.getStatus()).toBe(ModelStatus.NOT_LOADED);
		});
		
		it('should have initial progress as 0', () => {
			expect(service.getProgress()).toBe(0);
		});
		
		it('should change status to DOWNLOADING when initialize() is called', async () => {
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			const initPromise = service.initialize();
			
			expect(service.getStatus()).toBe(ModelStatus.DOWNLOADING);
			
			await initPromise;
		});
		
		it('should change status to READY after successful initialization', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			
			expect(service.getStatus()).toBe(ModelStatus.READY);
		});
		
		it('should change status to ERROR on initialization failure', async () => {
			mockPipeline.mockRejectedValue(new Error('Network error'));
			
			await expect(service.initialize()).rejects.toThrow('Network error');
			
			expect(service.getStatus()).toBe(ModelStatus.ERROR);
		});
		
		it('should not re-initialize if already initialized', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(mockPipeline).toHaveBeenCalledTimes(1);
			
			await service.initialize();
			expect(mockPipeline).toHaveBeenCalledTimes(1);
		});
		
		it('should not re-initialize if already downloading', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => resolve(mockTranscriber), 100);
				});
			});
			
			const promise1 = service.initialize();
			const promise2 = service.initialize();
			
			await Promise.all([promise1, promise2]);
			
			expect(mockPipeline).toHaveBeenCalledTimes(1);
		});
	});
	
	describe('Progress Tracking', () => {
		it('should call progress callback during model loading', async () => {
			const progressCallback = vi.fn();
			service.setProgressCallback(progressCallback);
			
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			await service.initialize();
			
			expect(progressCallback).toHaveBeenCalled();
		});
		
		it('should update progress value when progress callback is invoked', async () => {
			let capturedProgressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				capturedProgressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			const initPromise = service.initialize();
			
			if (capturedProgressCallback) {
				capturedProgressCallback({ status: 'downloading', progress: 0.25 });
				expect(service.getProgress()).toBe(25);
				
				capturedProgressCallback({ status: 'downloading', progress: 0.50 });
				expect(service.getProgress()).toBe(50);
				
				capturedProgressCallback({ status: 'downloading', progress: 0.75 });
				expect(service.getProgress()).toBe(75);
			}
			
			await initPromise;
			
			expect(service.getProgress()).toBe(100);
		});
		
		it('should notify progress callback with status updates', async () => {
			const progressCallback = vi.fn();
			service.setProgressCallback(progressCallback);
			
			let capturedProgressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				capturedProgressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			const initPromise = service.initialize();
			
			if (capturedProgressCallback) {
				capturedProgressCallback({ status: 'downloading', progress: 0.5 });
			}
			
			await initPromise;
			
			expect(progressCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					status: ModelStatus.DOWNLOADING,
				})
			);
			
			expect(progressCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					status: ModelStatus.READY,
					progress: 100,
				})
			);
		});
		
		it('should clear progress callback when set to undefined', async () => {
			const progressCallback = vi.fn();
			service.setProgressCallback(progressCallback);
			service.setProgressCallback(undefined);
			
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			
			expect(progressCallback).not.toHaveBeenCalled();
		});
	});
	
	describe('Model Updates', () => {
		it('should reset status to NOT_LOADED when model is updated', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(service.getStatus()).toBe(ModelStatus.READY);
			
			service.updateModel('Xenova/whisper-base.en');
			
			expect(service.getStatus()).toBe(ModelStatus.NOT_LOADED);
		});
		
		it('should reset progress to 0 when model is updated', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(service.getProgress()).toBe(100);
			
			service.updateModel('Xenova/whisper-base.en');
			
			expect(service.getProgress()).toBe(0);
		});
		
		it('should allow re-initialization after model update', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(mockPipeline).toHaveBeenCalledWith(
				'automatic-speech-recognition',
				'Xenova/whisper-tiny.en',
				expect.any(Object)
			);
			
			service.updateModel('Xenova/whisper-base.en');
			
			await service.initialize();
			expect(mockPipeline).toHaveBeenCalledWith(
				'automatic-speech-recognition',
				'Xenova/whisper-base.en',
				expect.any(Object)
			);
		});
	});
	
	describe('Transcription', () => {
		it('should initialize model if not loaded when transcribe is called', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'transcribed text' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			await service.transcribe(audio);
			
			expect(mockPipeline).toHaveBeenCalled();
			expect(service.getStatus()).toBe(ModelStatus.READY);
		});
		
		it('should return transcribed text', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: '  transcribed text  ' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			const result = await service.transcribe(audio);
			
			expect(result).toBe('transcribed text');
		});
		
		it('should throw error if transcriber fails to initialize', async () => {
			mockPipeline.mockRejectedValue(new Error('Failed to load model'));
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			
			await expect(service.transcribe(audio)).rejects.toThrow('Failed to load model');
		});
	});
	
	describe('Dispose', () => {
		it('should reset status to NOT_LOADED on dispose', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(service.getStatus()).toBe(ModelStatus.READY);
			
			service.dispose();
			
			expect(service.getStatus()).toBe(ModelStatus.NOT_LOADED);
		});
		
		it('should reset progress to 0 on dispose', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await service.initialize();
			expect(service.getProgress()).toBe(100);
			
			service.dispose();
			
			expect(service.getProgress()).toBe(0);
		});
	});
});
