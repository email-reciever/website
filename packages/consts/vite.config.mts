import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src', 'index.ts'),
        regexp: resolve(__dirname, 'src', 'regexp.ts'),
        github: resolve(__dirname, 'src', 'github.ts'),
        'white-lists': resolve(__dirname, 'src', 'white-lists.ts')
      }
    }
  }
})
