import { defineConfig, globalIgnores } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";

export default defineConfig([
  globalIgnores([
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "*.config.{ts,mts,js,mjs}",
  ]),
  ...pluginVue.configs["flat/essential"],
  ...vueTsEslintConfig(),
]);
