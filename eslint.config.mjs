import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  
  // TAMBAHKAN BAGIAN INI
  {
    rules: {
      // Ini akan menonaktifkan aturan standar (non-typescript)
      // "no-unused-vars": "off", 
      '@typescript-eslint/no-explicit-any': 'off',
      "no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
      // Ini akan mengaktifkan aturan typescript dan mengonfigurasinya
      // "@typescript-eslint/no-unused-vars": [
      //   "error", // Tetap laporkan sebagai error
      //   {
      //     "argsIgnorePattern": "^_", // Abaikan argumen fungsi yang diawali _
      //     "varsIgnorePattern": "^_", // Abaikan variabel lokal yang diawali _
      //     "caughtErrorsIgnorePattern": "^_" // Abaikan variabel di catch block yang diawali _
      //   }
      // ]
    }
  }
);