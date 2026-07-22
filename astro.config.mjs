// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://youthphase.dev',
  // The default HTML compressor eats newlines adjacent to tags, which
  // deletes real inter-word spaces — e.g. "at <code>h-7</code>" written
  // across a line break rendered as "ath-7" on /design-system. The few
  // kB of whitespace aren't worth mangled prose.
  compressHTML: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
