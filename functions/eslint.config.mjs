import prettier from "eslint-config-prettier/flat";

const eslintConfig = [
  prettier,
  {
    ignores: ["lib/**", "node_modules/**"],
  },
];

export default eslintConfig;
