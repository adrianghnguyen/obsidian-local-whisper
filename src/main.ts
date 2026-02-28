import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, LocalWhisperSettings, LocalWhisperSettingTab} from "./settings";
import {RecordingModal} from "./recording-modal";
import {TranscriptionService, ModelStatus} from "./transcription-service";

export default class LocalWhisperPlugin extends Plugin {
	settings: LocalWhisperSettings;
	transcriptionService: TranscriptionService;
	statusBarItem: HTMLElement | undefined;

	async onload() {
		await this.loadSettings();

		this.transcriptionService = new TranscriptionService(this.settings.modelName);
		
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.style.cursor = 'pointer';
		this.setupStatusBar();
		
		this.transcriptionService.setProgressCallback((info) => {
			this.updateStatusBar();
		});

		this.addRibbonIcon('microphone', 'Record audio for transcription', () => {
			this.openRecordingModal();
		});

		this.addCommand({
			id: 'start-recording',
			name: 'Start audio recording',
			callback: () => {
				this.openRecordingModal();
			}
		});

		this.addCommand({
			id: 'transcribe-and-insert',
			name: 'Record and insert transcription at cursor',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.openRecordingModal(editor);
			}
		});
		
		this.addCommand({
			id: 'load-model',
			name: 'Download/Load transcription model',
			callback: () => {
				this.loadModel();
			}
		});

		this.addSettingTab(new LocalWhisperSettingTab(this.app, this));

		console.debug('Local Whisper plugin loaded');
	}

	onunload() {
		if (this.transcriptionService) {
			this.transcriptionService.dispose();
		}
		console.debug('Local Whisper plugin unloaded');
	}

	openRecordingModal(editor?: Editor) {
		const modal = new RecordingModal(
			this.app,
			this.settings.maxRecordingDuration,
			async (audio: Float32Array) => {
				try {
					new Notice('Transcribing audio...');
					
					const text = await this.transcriptionService.transcribe(
						audio,
						this.settings.language
					);
					
					if (text) {
						if (editor) {
							editor.replaceSelection(text);
						} else {
							const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
							if (activeView) {
								const currentEditor = activeView.editor;
								currentEditor.replaceSelection(text);
							} else {
								await navigator.clipboard.writeText(text);
								new Notice('Transcription copied to clipboard!');
							}
						}
						new Notice('Transcription complete!');
					} else {
						new Notice('No speech detected in recording');
					}
				} catch (error) {
					new Notice('Transcription failed. Check console for details.');
					console.error('Transcription error:', error);
				}
			}
		);
		modal.open();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LocalWhisperSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		if (this.transcriptionService) {
			this.transcriptionService.updateModel(this.settings.modelName);
			this.updateStatusBar();
		}
	}
	
	setupStatusBar(): void {
		if (!this.statusBarItem) {
			return;
		}
		
		this.updateStatusBar();
		
		this.statusBarItem.onclick = () => {
			if (this.transcriptionService.getStatus() === ModelStatus.NOT_LOADED || 
			    this.transcriptionService.getStatus() === ModelStatus.ERROR) {
				this.loadModel();
			}
		};
	}
	
	updateStatusBar(): void {
		if (!this.statusBarItem) {
			return;
		}
		
		const status = this.transcriptionService.getStatus();
		const progress = this.transcriptionService.getProgress();
		
		this.statusBarItem.classList.remove(
			'whisper-status-not-loaded',
			'whisper-status-downloading',
			'whisper-status-ready',
			'whisper-status-error'
		);
		
		switch (status) {
			case ModelStatus.NOT_LOADED:
				this.statusBarItem.textContent = '🔴 Model not loaded (click to load)';
				this.statusBarItem.classList.add('whisper-status-not-loaded');
				break;
			case ModelStatus.DOWNLOADING:
				this.statusBarItem.textContent = `⏳ Downloading whisper model... ${progress}%`;
				this.statusBarItem.classList.add('whisper-status-downloading');
				break;
			case ModelStatus.READY:
				this.statusBarItem.textContent = '✓ Ready to transcribe';
				this.statusBarItem.classList.add('whisper-status-ready');
				break;
			case ModelStatus.ERROR:
				this.statusBarItem.textContent = '❌ Error loading model (click to retry)';
				this.statusBarItem.classList.add('whisper-status-error');
				break;
		}
	}
	
	async loadModel(): Promise<void> {
		try {
			await this.transcriptionService.initialize();
			this.updateStatusBar();
		} catch (error) {
			this.updateStatusBar();
			throw error;
		}
	}
}
