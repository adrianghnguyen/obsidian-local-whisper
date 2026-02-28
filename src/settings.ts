import {App, PluginSettingTab, Setting} from "obsidian";
import LocalWhisperPlugin from "./main";

export interface LocalWhisperSettings {
	modelName: string;
	language: string;
	maxRecordingDuration: number;
}

export const DEFAULT_SETTINGS: LocalWhisperSettings = {
	modelName: 'Xenova/whisper-tiny.en',
	language: 'english',
	maxRecordingDuration: 120
}

export class LocalWhisperSettingTab extends PluginSettingTab {
	plugin: LocalWhisperPlugin;

	constructor(app: App, plugin: LocalWhisperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Local Whisper Settings'});

		new Setting(containerEl)
			.setName('Model')
			.setDesc('Whisper model to use for transcription')
			.addDropdown(dropdown => dropdown
				.addOption('Xenova/whisper-tiny.en', 'Tiny English (39MB, fastest)')
				.addOption('Xenova/whisper-tiny', 'Tiny Multilingual (39MB)')
				.addOption('Xenova/whisper-base.en', 'Base English (74MB, better accuracy)')
				.addOption('Xenova/whisper-base', 'Base Multilingual (74MB)')
				.setValue(this.plugin.settings.modelName)
				.onChange(async (value) => {
					this.plugin.settings.modelName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Language')
			.setDesc('Language for transcription (only applies to multilingual models)')
			.addDropdown(dropdown => dropdown
				.addOption('english', 'English')
				.addOption('spanish', 'Spanish')
				.addOption('french', 'French')
				.addOption('german', 'German')
				.addOption('chinese', 'Chinese')
				.addOption('japanese', 'Japanese')
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Max recording duration')
			.setDesc('Maximum recording length in seconds (default: 120)')
			.addText(text => text
				.setPlaceholder('120')
				.setValue(String(this.plugin.settings.maxRecordingDuration))
				.onChange(async (value) => {
					const duration = parseInt(value);
					if (!isNaN(duration) && duration > 0) {
						this.plugin.settings.maxRecordingDuration = duration;
						await this.plugin.saveSettings();
					}
				}));
	}
}
