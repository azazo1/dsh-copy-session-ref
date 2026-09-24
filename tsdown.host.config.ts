import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  outDir: 'lib',
  dts: true,
  clean: true,
  sourcemap: false,
  target: 'es2022',
  deps: {
    // 与宿主共用同一份 cordis 与 schemastery, 不打进 Host bundle.
    neverBundle: ['@deepseek-ai/cordis', '@deepseek-ai/schemastery'],
  },
})
