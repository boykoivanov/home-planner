export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 180],
    "body-max-line-length": [2, "always", 180],
    "footer-max-line-length": [2, "always", 180],
  },
};
