const fs = require("fs");

for (const dir of [
  "reports/screenshots",
  "reports/api",
  "reports/self-healing/screenshots",
  "sql/results",
]) {
  fs.mkdirSync(dir, { recursive: true });
}
