import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

import { resolve } from 'node:path'

import { name, description, repository } from './package.json'

// https://astro.build/config
export default defineConfig({
  // normal config
  site: 'https://email-reciever.page.dev',
  server: {
    host: true,
    port: 10990,
    open: true
  },
  output: 'server',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap(), react(), tailwind({
    nesting: true
  })],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  vite: {
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src')
      }
    },
    ssr: {
      external: ['node:buffer']
    }
  },
  experimental: {
    actions: true,
    // contentCollectionCache: true,
    clientPrerender: true,
    globalRoutePriority: true,
    serverIslands: true,
    env: {
      schema: {
        SITETITLE: envField.string({ context: 'client', access: 'public', default: name }),
        SITEDESCRIPTION: envField.string({
          context: 'client', access: 'public', default: description
        }),
        SITEURL: envField.string({
          context: 'client', access: 'public', default: repository.url
        })
      },
      validateSecrets: true
    }
  },
  markdown: {
    shikiConfig: {
      themes: {
        dark: 'vitesse-dark',
        light: 'vitesse-light'
      },
      wrap: true
    }
  }
});
