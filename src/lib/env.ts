// src/lib/env.ts
// Lightweight runtime environment resolver for Cloudflare Workers & Node.js
let dotenvLoaded = false;

export async function getRuntimeEnv(key: string): Promise<string | undefined> {
  // 1. Platform-specific module exception: 'cloudflare:workers' only exists in Cloudflare Workers, not in Node.js dev.
  try {
    const cfModule = "cloudflare:workers";
    // @ts-ignore
    const cf = await import(/* @vite-ignore */ cfModule);
    if (cf && cf.env && cf.env[key]) return cf.env[key];
  } catch (e) {
    // Expected in local Node.js development runtime
  }

  // 2. Try import.meta.env (Astro build-time / dev fallback)
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // 3. Fallback to process.env (Node.js runtime)
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key];

    if (!dotenvLoaded) {
      try {
        // Dynamic import: dotenv only exists in Node.js dev/build, not inside Cloudflare Workers
        const dotenv = await import("dotenv");
        dotenv.config({ quiet: true });
        dotenvLoaded = true;
        if (process.env[key]) return process.env[key];
      } catch (e) {
        dotenvLoaded = true;
      }
    }
  }

  return undefined;
}
