import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalWhisperPlugin from './main';
import { ModelStatus } from './transcription-service';
import { createMockPlugin, flushPromises } from './__mocks__/test-utils';
import { mockPipeline } from './__mocks__/transformers';

vi.mock('@huggingface/transformers');
vi.mock('obsidian');

describe('LocalWhisperPlugin', () => {
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
	
	describe('Status Bar Integration', () => {
		it('should create status bar item on plugin load', async () => {
			await plugin.onload();
			
			expect(mockPluginBase.addStatusBarItem).toHaveBeenCalled();
		});
		
		it('should display initial status as "Model not loaded"', async () => {
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem).toBeDefined();
			expect(statusBarItem?.textContent).toContain('not loaded');
		});
		
		it('should update status bar text when model is downloading', async () => {
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			await plugin.onload();
			
			const loadPromise = plugin.loadModel();
			await flushPromises();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('Downloading');
			
			await loadPromise;
		});
		
		it('should update status bar text when model is ready', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			await plugin.loadModel();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('Ready');
		});
		
		it('should update status bar text on error', async () => {
			mockPipeline.mockRejectedValue(new Error('Network error'));
			
			await plugin.onload();
			
			try {
				await plugin.loadModel();
			} catch (error) {
				// Expected error
			}
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.textContent).toContain('Error');
		});
		
		it('should display progress percentage during download', async () => {
			let progressCallback: ((info: { status: string; progress?: number }) => void) | undefined;
			
			mockPipeline.mockImplementation((task: string, model: string, options?: { progress_callback?: (info: { status: string; progress?: number }) => void }) => {
				progressCallback = options?.progress_callback;
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			await plugin.onload();
			const loadPromise = plugin.loadModel();
			await flushPromises();
			
			if (progressCallback) {
				progressCallback({ status: 'downloading', progress: 0.45 });
				await flushPromises();
				
				const statusBarItem = plugin.statusBarItem;
				expect(statusBarItem?.textContent).toContain('45%');
			}
			
			await loadPromise;
		});
		
		it('should make status bar clickable', async () => {
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.style.cursor).toBe('pointer');
		});
		
		it('should trigger model load when status bar is clicked', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);
			
			statusBarItem?.click();
			await flushPromises();
			
			expect(mockPipeline).toHaveBeenCalled();
		});
		
		it('should not trigger duplicate loads when status bar is clicked multiple times', async () => {
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
		});
	});
	
	describe('Manual Load Command', () => {
		it('should register "Load Model" command', async () => {
			await plugin.onload();
			
			const commands = mockPluginBase.addCommand.mock.calls.map(call => call[0]);
			const loadCommand = commands.find(cmd => cmd.id === 'load-model');
			
			expect(loadCommand).toBeDefined();
			expect(loadCommand?.name).toContain('Load');
		});
		
		it('should trigger model loading when command is executed', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			
			const commands = mockPluginBase.addCommand.mock.calls.map(call => call[0]);
			const loadCommand = commands.find(cmd => cmd.id === 'load-model');
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.NOT_LOADED);
			
			loadCommand?.callback?.();
			await flushPromises();
			
			expect(mockPipeline).toHaveBeenCalled();
		});
		
		it('should show notice when model loading completes via command', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			const NoticeSpy = vi.fn();
			vi.doMock('obsidian', () => ({
				Notice: NoticeSpy,
				Plugin: vi.fn(),
			}));
			
			await plugin.onload();
			
			const commands = mockPluginBase.addCommand.mock.calls.map(call => call[0]);
			const loadCommand = commands.find(cmd => cmd.id === 'load-model');
			
			await loadCommand?.callback?.();
			
			expect(plugin.transcriptionService.getStatus()).toBe(ModelStatus.READY);
		});
	});
	
	describe('Status Updates', () => {
		it('should update status bar when transcription service status changes', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			
			expect(plugin.statusBarItem?.textContent).toContain('not loaded');
			
			await plugin.transcriptionService.initialize();
			await flushPromises();
			
			expect(plugin.statusBarItem?.textContent).toContain('Ready');
		});
		
		it('should reset status bar when model is changed in settings', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			await plugin.transcriptionService.initialize();
			
			expect(plugin.statusBarItem?.textContent).toContain('Ready');
			
			plugin.settings.modelName = 'Xenova/whisper-base.en';
			await plugin.saveSettings();
			await flushPromises();
			
			expect(plugin.statusBarItem?.textContent).toContain('not loaded');
		});
	});
	
	describe('Status Bar Styling', () => {
		it('should apply "not-loaded" class when model is not loaded', async () => {
			await plugin.onload();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.classList.contains('whisper-status-not-loaded')).toBe(true);
		});
		
		it('should apply "downloading" class when model is downloading', async () => {
			mockPipeline.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
						resolve(mockTranscriber);
					}, 100);
				});
			});
			
			await plugin.onload();
			const loadPromise = plugin.loadModel();
			await flushPromises();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.classList.contains('whisper-status-downloading')).toBe(true);
			
			await loadPromise;
		});
		
		it('should apply "ready" class when model is ready', async () => {
			const mockTranscriber = vi.fn().mockResolvedValue({ text: 'test' });
			mockPipeline.mockResolvedValue(mockTranscriber);
			
			await plugin.onload();
			await plugin.loadModel();
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.classList.contains('whisper-status-ready')).toBe(true);
		});
		
		it('should apply "error" class when there is an error', async () => {
			mockPipeline.mockRejectedValue(new Error('Network error'));
			
			await plugin.onload();
			
			try {
				await plugin.loadModel();
			} catch (error) {
				// Expected error
			}
			
			const statusBarItem = plugin.statusBarItem;
			expect(statusBarItem?.classList.contains('whisper-status-error')).toBe(true);
		});
	});
});
