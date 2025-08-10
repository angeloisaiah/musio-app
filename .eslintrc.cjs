/* eslint-env node */
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  env: { node: true, es2022: true },
  ignorePatterns: ["dist", "build", "node_modules"],
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  rules: {
    "import/no-unresolved": "off"
  }
};
