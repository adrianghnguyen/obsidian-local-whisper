import { vi } from 'vitest';
import type { App, Workspace, Vault, Command } from 'obsidian';

export function createMockApp(): App {
	return {
		workspace: {
			on: vi.fn(),
			getActiveViewOfType: vi.fn().mockReturnValue(null),
		} as unknown as Workspace,
		vault: {
			adapter: {
				basePath: '/mock/vault',
			},
		} as unknown as Vault,
	} as App;
}

export function createMockPlugin() {
	const app = createMockApp();
	return {
		app,
		manifest: {
			id: 'test-plugin',
			name: 'Test Plugin',
			version: '1.0.0',
			minAppVersion: '0.15.0',
			description: 'Test plugin',
			author: 'Test Author',
		},
		loadData: vi.fn().mockResolvedValue({}),
		saveData: vi.fn().mockResolvedValue(undefined),
		addRibbonIcon: vi.fn().mockReturnValue(document.createElement('div')),
		addCommand: vi.fn((cmd: Command) => cmd),
		addSettingTab: vi.fn(),
		addStatusBarItem: vi.fn(() => {
			const el = document.createElement('div');
			el.classList.add('status-bar-item');
			return el;
		}),
		registerEvent: vi.fn(),
		registerDomEvent: vi.fn(),
		registerInterval: vi.fn((id: number) => id),
	};
}

export function waitFor(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function flushPromises(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}
