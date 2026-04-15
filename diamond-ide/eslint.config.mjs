import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", "coverage/**", "playwright-report/**", "test-results/**"]
  },
  ...nextVitals
];

export default config;
