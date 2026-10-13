const shared = {
  paths: ["tests/features/**/*.feature"],
  require: ["tests/support/**/*.ts", "tests/steps/**/*.ts"],
  requireModule: ["ts-node/register"],
};

module.exports = {
  default: {
    ...shared,
    tags: "not @self-healing",
    format: [
      "summary",
      "html:reports/cucumber-report.html",
      "json:reports/cucumber-report.json",
    ],
  },
  selfHealing: {
    ...shared,
    tags: "@self-healing",
    format: [
      "summary",
      "html:reports/self-healing/cucumber-report.html",
      "json:reports/self-healing/cucumber-report.json",
    ],
  },
};
