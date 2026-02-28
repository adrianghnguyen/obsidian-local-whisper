import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/__mocks__/**'],
		},
		mockReset: true,
		restoreMocks: true,
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
			'@huggingface/transformers': path.resolve(__dirname, 'src/__mocks__/transformers.ts'),
		},
	},
});
