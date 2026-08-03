import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const workerDir = path.join(distDir, '_worker.js');

if (fs.existsSync(clientDir) && fs.existsSync(serverDir)) {
  // 1. Move everything from dist/client to dist
  const clientFiles = fs.readdirSync(clientDir);
  for (const file of clientFiles) {
    fs.renameSync(path.join(clientDir, file), path.join(distDir, file));
  }
  fs.rmdirSync(clientDir);

  // 2. Rename dist/server to dist/_worker.js
  fs.renameSync(serverDir, workerDir);

  // 3. Rename entry.mjs to index.js inside _worker.js
  const entryPath = path.join(workerDir, 'entry.mjs');
  const indexPath = path.join(workerDir, 'index.js');
  if (fs.existsSync(entryPath)) {
    fs.renameSync(entryPath, indexPath);
  }

  // 4. Remove the wrangler.json inside _worker.js as Cloudflare Pages rejects it
  const wranglerJsonPath = path.join(workerDir, 'wrangler.json');
  if (fs.existsSync(wranglerJsonPath)) {
    fs.unlinkSync(wranglerJsonPath);
  }

  // 5. Delete the .wrangler directory created by Astro during build
  const dotWranglerPath = path.resolve('.wrangler');
  if (fs.existsSync(dotWranglerPath)) {
    fs.rmSync(dotWranglerPath, { recursive: true, force: true });
  }

  console.log('Successfully reshaped Astro output for Cloudflare Pages!');
} else {
  console.log('Could not find dist/client or dist/server. Skipping reshape.');
}
