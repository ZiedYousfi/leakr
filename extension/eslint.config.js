import js from "@eslint/js";
import globals from "globals";
import tsEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser"
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";

// Fonction utilitaire pour obtenir une config sans la clé "extends"
// et pour s'assurer de renvoyer un tableau d'objets
function getConfig(config) {
  if (Array.isArray(config)) {
    return config.map(c =>
      c && c.extends ? (({ extends: _ignored, ...rest }) => rest)(c) : c
    );
  } else if (config && config.extends) {
    const { extends: _ignored, ...rest } = config;
    return [rest];
  } else if (config) {
    return [config];
  }
  return [];
}

const jsConfigs = getConfig(js.configs.recommended);
const tsConfigs = getConfig(tsEslint.configs.recommended);
const jsonConfigs = getConfig(json.configs.recommended);
const jsoncConfigs = getConfig(json.configs["recommended-with-jsonc"]);
const json5Configs = getConfig(json.configs["recommended-with-json5"]);
const markdownConfigs = getConfig(markdown.configs.recommended);
const cssConfigs = getConfig(css.configs.recommended);

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "*.config.js",
    ],
  },
  // Configuration recommandée pour les fichiers JavaScript
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    ...(jsConfigs.length ? jsConfigs[0] : {}),
    languageOptions: { globals: globals.browser },
  },
  // Configuration recommandée pour les fichiers TypeScript
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tsEslint },
    ...(tsConfigs.length ? tsConfigs[0] : {}),
    languageOptions: { parser: tsParser },
  },
  // Configuration recommandée pour les fichiers JSON
  {
    files: ["**/*.json"],
    plugins: { json },
    ...(jsonConfigs.length ? jsonConfigs[0] : {}),
    language: "json/json",
  },
  // Pour JSONC (si défini)
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    ...(jsoncConfigs.length ? jsoncConfigs[0] : {}),
    languageOptions: {
      parser: json.parser,
    },
  },
  // Pour JSON5 (si défini)
  {
    files: ["**/*.json5"],
    plugins: { json },
    ...(json5Configs.length ? json5Configs[0] : {}),
    languageOptions: {
      parser: json.parser,
    },
  },
  // Pour Markdown
  {
    files: ["**/*.md"],
    plugins: { markdown },
    ...(markdownConfigs.length ? markdownConfigs[0] : {}),
    languageOptions: {
      parser: markdown.parser,
    },
  },
  // Pour CSS avec règles personnalisées
  {
    files: ["**/*.css"],
    plugins: { css },
    ...(cssConfigs.length ? cssConfigs[0] : {}),
    language: "css/css",
    rules: {
      "css/no-duplicate-imports": "error",
      "css/no-empty-blocks": "warn",
      "css/no-invalid-at-rules": "error",
      "css/no-invalid-properties": "error",
      "css/require-baseline": "off",
      "css/use-layers": "off",
    },
  },
];
