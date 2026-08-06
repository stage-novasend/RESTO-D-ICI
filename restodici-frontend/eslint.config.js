import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['*.config.js', 'playwright.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['*.config.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
    },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs['jsx-runtime'].rules,
      'react/jsx-key': 'error',
      // Pas de lib prop-types installée et migration TS prévue à terme : la
      // validation de props runtime n'est pas actionnable ici (~1400 erreurs).
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      // varsIgnorePattern: convention pour une clé volontairement omise via
      // déstructuration (const { [k]: _, ...rest } = obj) — pas une variable
      // oubliée.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_$' }],
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
