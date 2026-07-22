// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
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
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      // Class *ordering* and line-wrapping are Prettier's job here, not
      // this plugin's opinion — enabling them would fight prettier-plugin-astro
      // and force a one-time reflow of nearly every class string in the
      // codebase for no correctness benefit. The catchers that matter
      // (typos, conflicts, duplicates) stay on.
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      // detectComponentClasses only recognizes Tailwind v4's own @utility
      // mechanism, not plain hand-written CSS classes like .sky-card —
      // this project's actual custom classes (defined in global.css and
      // component <style> blocks) need an explicit allowlist instead.
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: [
            '^sky-',
            '^lightbox-',
            '^tape',
            '^link-squiggle$',
            '^photo-print$',
            '^field-error$',
            '^star$',
            '^rain-drop$',
            '^shooting-star$',
            '^show-dim$',
            '^sparkle$',
          ],
        },
      ],
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/styles/global.css',
      },
    },
  },
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
