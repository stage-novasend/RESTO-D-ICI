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
      // Cosmétique (apostrophes non échappées en JSX) : signalé sans bloquer le lint.
      'react/no-unescaped-entities': 'warn',
      'no-unused-vars': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      // Règles "React Compiler readiness" : signalent une vraie dette (God
      // Components qui redéfinissent des sous-composants dans le render,
      // Date.now()/refs lus pendant le rendu). Corriger correctement demande
      // de découper AdminDashboard/StaffDashboard/etc. (cf. audit) — un
      // chantier à part, pas quelque chose à faire taire silencieusement.
      // En 'warn' pour rester visible en CI sans bloquer le pipeline.
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Idem : fichiers hooks partagés (useAdminRealtime, useLanguage) qui
      // exportent aussi des constantes — casse le Fast Refresh en dev
      // uniquement, aucun impact runtime.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
