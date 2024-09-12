import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const mark = 'process.browser'

export default defineConfig({
  // plugins: [
  //   {
  //     apply: 'build',
  //     name: 'replace-browser',
  //     transform: (code, id, options) => {

  //     },
  //   }
  // ],
  build: {
    rollupOptions: {
      external: ['@mixmark-io/domino']
    },
    sourcemap: true,
    lib: {
      name: 'turndown',
      fileName: 'turndown',
      entry: resolve(__dirname, 'src', 'turndown.js')
    }
  }
})
