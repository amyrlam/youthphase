// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.astro/',
      '.vercel/',
      'test-results/',
      'playwright-report/',
      '.impeccable/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Sets up its own parser for .astro files (frontmatter + template) —
  // don't add a second parser config for .astro below, it'll conflict.
  ...astro.configs['flat/recommended'],
  ...astro.configs['flat/jsx-a11y-recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Client-side scripts and Astro <script> blocks assume no-unused-vars
    // for CSS-only classes referenced only in markup — irrelevant here,
    // but Astro props destructured from frontmatter can look "unused" to
    // the linter when they're only interpolated into template markup.
    files: ['src/**/*.ts', 'src/**/*.astro'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The lightbox video is ambient silent b-roll (no dialogue/narration) —
    // a real caption gap, just not one this file has content for. Astro's
    // template <!-- eslint-disable --> comments aren't honored by the
    // jsx-a11y rules ported through eslint-plugin-astro, so this has to be
    // a file-level override rather than an inline directive.
    files: ['src/components/Lightbox.astro'],
    rules: {
      'astro/jsx-a11y/media-has-caption': 'off',
    },
  },
  prettier,
);
