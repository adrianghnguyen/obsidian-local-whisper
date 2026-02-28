import { vi } from 'vitest';

export const mockPipeline = vi.fn();

export const pipeline = mockPipeline;

export const env = {
	allowLocalModels: true,
	backends: {
		onnx: {
			wasm: {
				numThreads: 1,
			},
		},
	},
};
