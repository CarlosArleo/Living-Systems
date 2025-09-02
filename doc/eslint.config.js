// eslint.config.js - ESLint 9 Flat Config (replaces .eslintrc)
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // Base JavaScript recommendations
  js.configs.recommended,
  
  // TypeScript configurations
  ...tseslint.configs.recommended,
  
  // Next.js specific configuration
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    
    rules: {
      // React/Next.js best practices
      'react/react-in-jsx-scope': 'off', // Not needed with Next.js
      'react/prop-types': 'off', // Using TypeScript
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // General code quality
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Genkit-specific allowances
      '@typescript-eslint/no-require-imports': 'off', // Genkit uses require in some cases
    },
  },
  
  // Configuration for specific file types
  {
    files: ['**/*.config.{js,ts}', '**/scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off', // Allow console in config files and scripts
    },
  },
  
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      '.genkit/**',
      'lib/**', // Firebase functions build output
      '*.config.js',
      'coverage/**',
    ],
  },
]