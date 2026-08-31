import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      // Pustaka dan hook ikut diperiksa. Sebelumnya src/lib diabaikan
      // seluruhnya — padahal di situlah aturan-aturan inti aplikasi tinggal.
      "src/lib/**/*.{js,mjs,cjs,jsx}",
      "src/hooks/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // Variabel yang dipakai tapi tidak ada.
      //
      // Ini yang menjatuhkan halaman Pembelian 31-08-2026: saat kueri
      // WarehouseTransaction dihapus, satu sisa `transaksi` tertinggal di
      // daftar dependensi useMemo. Build tetap hijau — Vite tidak memeriksa
      // nama variabel — dan halamannya baru mati saat dibuka orang:
      // "transaksi is not defined".
      //
      // Aturan ini SEBENARNYA sudah ada di pluginJs.configs.recommended yang
      // di-spread di atas, tapi blok `rules` di bawah menimpanya bulat-bulat.
      // Jadi selama ini ia mati tanpa ada yang sadar.
      "no-undef": "error",
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
