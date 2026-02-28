import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, LocalWhisperSettings, LocalWhisperSettingTab} from "./settings";
import {RecordingModal} from "./recording-modal";
import {TranscriptionService} from "./transcription-service";

export default class LocalWhisperPlugin extends Plugin {
	settings: LocalWhisperSettings;
	transcriptionService: TranscriptionService;

	async onload() {
		await this.loadSettings();

		this.transcriptionService = new TranscriptionService(this.settings.modelName);

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
		}
	}
}
