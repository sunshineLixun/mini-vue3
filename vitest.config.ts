import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@vue/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
			'@vue/runtime-core': resolve(__dirname, 'packages/runtime-core/src/index.ts')
		}
	}
});
