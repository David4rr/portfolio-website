// ponytail: minimalist content config with loader (Astro v5+)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    type: z.string().optional(),
    techStack: z.array(z.string()).optional(),
    gallery: z.array(z.string()).optional(),
  }),
});

export const collections = { projects };
