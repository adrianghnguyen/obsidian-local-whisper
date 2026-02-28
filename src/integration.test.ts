import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Command } from 'obsidian';
import LocalWhisperPlugin from './main';
import { ModelStatus } from './transcription-service';
import { createMockPlugin, flushPromises } from './__mocks__/test-utils';
import { mockPipeline } from './__mocks__/transformers';

vi.mock('@huggingface/transformers');
vi.mock('obsidian');

describe('Integration Tests', () => {
	let plugin: LocalWhisperPlugin;
	let mockPluginBase: ReturnType<typeof createMockPlugin>;
	
	beforeEach(() => {
		vi.clearAllMocks();
		mockPluginBase = createMockPlugin();
		
		plugin = new LocalWhisperPlugin(mockPluginBase.app, mockPluginBase.manifest);
		
		Object.assign(plugin, {
			loadData: mockPluginBase.loadData,
			saveData: mockPluginBase.saveData,
			addRibbonIcon: mockPluginBase.addRibbonIcon,
			addCommand: mockPluginBase.addCommand,
			addSettingTab: mockPluginBase.addSettingTab,
			addStatusBarItem: mockPluginBase.addStatusBarItem,
			registerEvent: mockPluginBase.registerEvent,
			registerDomEvent: mockPluginBase.registerDomEvent,
			registerInterval: mockPluginBase.registerInterval,
		});
	});
	
	afterEach(() => {
		if (plugin) {
			plugin.onunload();
		}
	});
	
	describe('Complete User Flow: Status Bar Click → Download → Ready', () => {
		it('should complete full flow from click to ready state', async () => {
			let progressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				progressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('not loaded');
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);
			
			statusBarItem?.click();
			await flushPromises();
			
			expect(statusBarItem?.textContent).toContain('Downloading');
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.DOWNLOADING);
			
			if (progressCallback) {
				progressCallback({ status: 'downloading', progress: 0.25 });
				await flushPromises();
				expect(statusBarItem?.textContent).toContain('25%');
				
				progressCallback({ status: 'downloading', progress: 0.50 });
				await flushPromises();
				expect(statusBarItem?.textContent).toContain('50%');
				
				progressCallback({ status: 'downloading', progress: 0.75 });
				await flushPromises();
				expect(statusBarItem?.textContent).toContain('75%');
			}
			
			await new Promise((resolve) => setTimeout(resolve, 100));
			
			expect(statusBarItem?.textContent).toContain('Ready');
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
	});
	
	describe('Complete User Flow: Command → Download → Ready', () => {
		it('should complete full flow from command to ready state', async () => {
			let progressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				progressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			await plugin.onload();
			
			const commands = mockPluginBase.addCommand.mock.calls.map((call: [Command]) => call[0]);
			const loadCommand = commands.find((cmd: Command) => cmd.id === 'load-model');

			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);

			loadCommand?.callback?.();
			await flushPromises();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.DOWNLOADING);
			
			if (progressCallback) {
				progressCallback({ status: 'downloading', progress: 0.5 });
				await flushPromises();
			}
			
			await new Promise((resolve) => setTimeout(resolve, 100));
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
	});
	
	describe('Complete User Flow: Transcription Triggers Load', () => {
		it('should load model automatically when transcription is requested', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'Hello world' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			const result = await plugin.transcriptionService.transcribe(audio);
			
			expect(result).toBe('Hello world');
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
			expect(mockPipeline).toHaveBeenCalled();
		});
		
		it('should update status bar during automatic load', async () => {
			let progressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				progressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'Hello world' });
						resolve(mockTranscriber);
					}, 50);
				});
			});
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('not loaded');
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			const transcribePromise = plugin.transcriptionService.transcribe(audio);
			
			await flushPromises();
			expect(statusBarItem?.textContent).toContain('Downloading');
			
			if (progressCallback) {
				progressCallback({ status: 'downloading', progress: 0.5 });
				await flushPromises();
			}
			
			await transcribePromise;
			expect(statusBarItem?.textContent).toContain('Ready');
		});
	});
	
	describe('Error Handling and Recovery', () => {
		it('should handle network errors gracefully', async () => {
			mockPipeline.mockRejectedValue(new Error('Network error'));
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			
			try {
				await plugin.loadModel();
			} catch (_error) {
				// Expected error
			}

			expect(statusBarItem?.textContent).toContain('Error');
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.ERROR);
		});
		
		it('should allow retry after error', async () => {
			mockPipeline.mockRejectedValueOnce(new Error('Network error'));
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValueOnce(mockTranscriber);
			
			await plugin.onload();
			
			try {
				await plugin.loadModel();
			} catch (_error) {
				// Expected error
			}
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.ERROR);
			
			await plugin.loadModel();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
	});
	
	describe('Model Change Flow', () => {
		it('should reset status and reload when model changes', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			await plugin.loadModel();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
			expect(mockPipeline).toHaveBeenCalledWith(
				'automatic-speech-recognition',
				'Xenova/whisper-tiny.en',
				expect.any(Object)
			);
			
			plugin.settings.modelName = 'Xenova/whisper-base.en';
			await plugin.saveSettings();
			await flushPromises();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);
			expect(plugin.statusBarItem?.textContent).toContain('not loaded');
			
			await plugin.loadModel();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
			expect(mockPipeline).toHaveBeenCalledWith(
				'automatic-speech-recognition',
				'Xenova/whisper-base.en',
				expect.any(Object)
			);
		});
	});
	
	describe('Multiple Concurrent Operations', () => {
		it('should handle multiple load attempts without duplication', async () => {
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			await plugin.onload();
			
			const promise1 = plugin.loadModel();
			const promise2 = plugin.loadModel();
			const promise3 = plugin.loadModel();
			
			await Promise.all([promise1, promise2, promise3]);
			
			expect(mockPipeline).toHaveBeenCalledTimes(1);
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
		
		it('should queue status bar clicks during download', async () => {
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			statusBarItem?.click();
			statusBarItem?.click();
			statusBarItem?.click();
			
			await flushPromises();
			await new Promise((resolve) => setTimeout(resolve, 150));
			
			expect(mockPipeline).toHaveBeenCalledTimes(1);
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
	});
	
	describe('Status Bar Lifecycle', () => {
		it('should maintain status bar state across multiple operations', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('not loaded');
			
			await plugin.loadModel();
			expect(statusBarItem?.textContent).toContain('Ready');
			
			const audio = new Float32Array([0.1, 0.2, 0.3]);
			await plugin.transcriptionService.transcribe(audio);
			
			expect(statusBarItem?.textContent).toContain('Ready');
			
			plugin.settings.modelName = 'Xenova/whisper-base.en';
			await plugin.saveSettings();
			
			expect(statusBarItem?.textContent).toContain('not loaded');
		});
	});
});
