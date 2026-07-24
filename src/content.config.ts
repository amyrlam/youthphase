import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.coerce.date(),
    draft: z.boolean().default(false),
    // Present only on reposts: a piece originally published elsewhere and
    // mirrored here so the link never rots.
    original: z
      .object({
        url: z.string().url(),
        source: z.string(),
      })
      .optional(),
  }),
});

export const collections = { blog };
