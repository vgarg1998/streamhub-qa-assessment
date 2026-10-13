import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync("sql/schema.sql", "utf8"));
db.exec(fs.readFileSync("sql/seed.sql", "utf8"));

function query(file) {
  return db.prepare(fs.readFileSync(file, "utf8")).all();
}

function signature(rows, columns) {
  return rows.map((row) => columns.map((column) => row[column]).join("|")).join("\n");
}

const roundTrips = query("sql/scenario1_round_trip.sql");
const streaks = query("sql/scenario2_streaks.sql");

const roundTripExpected = ["A|B|1000|950", "D|E|800|880", "H|I|400|400"].join("\n");
const streakExpected = [
  "Virat Kohli|2024-03-22|3",
  "Rishabh Pant|2024-03-23|4",
  "Suryakumar Yadav|2024-03-25|3",
  "Hardik Pandya|2024-03-29|3",
  "Suryakumar Yadav|2024-04-13|3",
].join("\n");

const roundTripActual = signature(roundTrips, ["account_a", "account_b", "amount_sent", "amount_returned"]);
const streakActual = signature(streaks, ["player_name", "streak_started_on", "matches_in_streak"]);

fs.mkdirSync("sql/results", { recursive: true });
fs.writeFileSync("sql/results/scenario1.txt", JSON.stringify(roundTrips, null, 2));
fs.writeFileSync("sql/results/scenario2.txt", JSON.stringify(streaks, null, 2));

function table(rows) {
  if (rows.length === 0) return "<p>No rows.</p>";
  const columns = Object.keys(rows[0]);
  const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function page({ title, intro, sql, rows }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 32px; background: #f3eee6; color: #1c1915; font: 16px/1.45 "Avenir Next", "Segoe UI", sans-serif; }
    h1 { font-family: Palatino, Georgia, serif; font-size: 32px; margin: 0 0 8px; }
    p { max-width: 760px; color: #4e463e; }
    pre { white-space: pre-wrap; background: #14261e; color: #f6f1e7; padding: 16px; border-radius: 12px; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; background: #fbf8f3; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ddd4c6; text-align: left; padding: 8px 10px; font-variant-numeric: tabular-nums; }
    th { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(intro)}</p>
  <pre>${escapeHtml(sql.trim())}</pre>
  ${rows ? table(rows) : ""}
</body>
</html>`;
}

const pages = [
  {
    file: "sql/results/schema.png",
    html: page({
      title: "Table schema",
      intro: "Amounts are whole rupees. Timestamps and match dates are ISO text so they sort without a cast.",
      sql: fs.readFileSync("sql/schema.sql", "utf8"),
      rows: null,
    }),
  },
  {
    file: "sql/results/scenario1.png",
    html: page({
      title: "Scenario 1 — round-trip transfers",
      intro: "Account A pays B, and B pays A a similar amount (within 10%) inside 24 hours. Amounts are rupees.",
      sql: fs.readFileSync("sql/scenario1_round_trip.sql", "utf8"),
      rows: roundTrips,
    }),
  },
  {
    file: "sql/results/scenario2.png",
    html: page({
      title: "Scenario 2 — scoring streaks",
      intro: "Synthetic IPL-style 2024 scores. A streak is 30 or more runs in at least three consecutive matches the player played. The date is the first match of that streak.",
      sql: fs.readFileSync("sql/scenario2_streaks.sql", "utf8"),
      rows: streaks,
    }),
  },
];

const browser = await chromium.launch({ headless: true });
const screen = await browser.newPage({ viewport: { width: 1100, height: 900 } });
for (const item of pages) {
  await screen.setContent(item.html, { waitUntil: "load" });
  await screen.screenshot({ path: item.file, fullPage: true });
}
await browser.close();

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    console.error(`${name} did not match.\nActual:\n${actual}\nExpected:\n${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`${name}: ${actual.split("\n").length} rows`);
  }
}

assertEqual("round-trip", roundTripActual, roundTripExpected);
assertEqual("streaks", streakActual, streakExpected);
if (process.exitCode) process.exit(process.exitCode);
console.log("Wrote sql/results/schema.png, scenario1.png, and scenario2.png");
