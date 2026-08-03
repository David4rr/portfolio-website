// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import preact from '@astrojs/preact';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

const isDev = process.env.npm_lifecycle_event === 'dev';

// https://astro.build/config
export default defineConfig({
  site: 'https://portfolio.example.com',
  output: 'server',
  adapter: isDev 
    ? node({ mode: 'standalone' }) 
    : cloudflare({ imageService: 'cloudflare', platformProxy: { enabled: false } }),
  image: {
    domains: ['images.unsplash.com'],
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap(), preact()]
});