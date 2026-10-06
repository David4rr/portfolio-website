// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import preact from '@astrojs/preact';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

const isDev = process.env.npm_lifecycle_event === 'dev' || process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://portfolio.example.com',
  output: 'server',
  adapter: isDev 
    ? node({ mode: 'standalone' }) 
    : cloudflare({ 
        platformProxy: { enabled: false },
        imageService: 'compile'
      }),
  build: {
    inlineStylesheets: 'always'
  },
  image: {
    domains: ["wsrv.nl", "prod-files-secure.s3.us-west-2.amazonaws.com", "images.unsplash.com", "blogger.googleusercontent.com"],
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.blogger.com' }
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      modulePreload: false
    }
  },

  integrations: [sitemap(), preact()]
});