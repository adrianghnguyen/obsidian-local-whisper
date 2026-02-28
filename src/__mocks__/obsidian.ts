import { vi } from 'vitest';

export class Notice {
	message: string;
	
	constructor(message: string) {
		this.message = message;
	}
}

export class Plugin {
	app: App;
	manifest: PluginManifest;
	
	loadData(): Promise<unknown> {
		return Promise.resolve({});
	}
	
	saveData(data: unknown): Promise<void> {
		return Promise.resolve();
	}
	
	addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
		const el = document.createElement('div');
		el.setAttribute('aria-label', title);
		return el;
	}
	
	addCommand(command: Command): Command {
		return command;
	}
	
	addSettingTab(tab: PluginSettingTab): void {
		// Mock implementation
	}
	
	addStatusBarItem(): HTMLElement {
		const el = document.createElement('div');
		el.classList.add('status-bar-item');
		return el;
	}
	
	registerEvent(eventRef: EventRef): void {
		// Mock implementation
	}
	
	registerDomEvent(
		el: Window | Document | HTMLElement,
		type: string,
		callback: (...args: unknown[]) => void
	): void {
		// Mock implementation
	}
	
	registerInterval(id: number): number {
		return id;
	}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;
	
	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement('div');
	}
	
	display(): void {
		// Mock implementation
	}
	
	hide(): void {
		// Mock implementation
	}
}

export class Setting {
	settingEl: HTMLElement;
	
	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement('div');
		containerEl.appendChild(this.settingEl);
	}
	
	setName(name: string): this {
		return this;
	}
	
	setDesc(desc: string): this {
		return this;
	}
	
	setHeading(): this {
		return this;
	}
	
	addText(callback: (text: TextComponent) => void): this {
		callback(new TextComponent());
		return this;
	}
	
	addDropdown(callback: (dropdown: DropdownComponent) => void): this {
		callback(new DropdownComponent());
		return this;
	}
}

export class TextComponent {
	value = '';
	
	setPlaceholder(placeholder: string): this {
		return this;
	}
	
	setValue(value: string): this {
		this.value = value;
		return this;
	}
	
	onChange(callback: (value: string) => void): this {
		return this;
	}
}

export class DropdownComponent {
	value = '';
	options: Record<string, string> = {};
	
	addOption(value: string, label: string): this {
		this.options[value] = label;
		return this;
	}
	
	setValue(value: string): this {
		this.value = value;
		return this;
	}
	
	onChange(callback: (value: string) => void): this {
		return this;
	}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;
	titleEl: HTMLElement;
	
	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement('div');
		this.titleEl = document.createElement('div');
	}
	
	open(): void {
		// Mock implementation
	}
	
	close(): void {
		// Mock implementation
	}
	
	onOpen(): void {
		// Mock implementation
	}
	
	onClose(): void {
		// Mock implementation
	}
}

export class MarkdownView {
	editor: Editor;
	
	constructor() {
		this.editor = new Editor();
	}
}

export class Editor {
	replaceSelection(text: string): void {
		// Mock implementation
	}
	
	getSelection(): string {
		return '';
	}
}

export interface App {
	workspace: Workspace;
	vault: Vault;
}

export interface Workspace {
	on(name: string, callback: (...args: unknown[]) => void): EventRef;
	getActiveViewOfType<T>(type: new (...args: unknown[]) => T): T | null;
}

export interface Vault {
	adapter: {
		basePath: string;
	};
}

export interface EventRef {
	// Mock event reference
}

export interface Command {
	id: string;
	name: string;
	callback?: () => void;
	editorCallback?: (editor: Editor, view: MarkdownView) => void;
}

export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	minAppVersion: string;
	description: string;
}
