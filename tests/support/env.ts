import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.`);
  }
  return value;
}

export const env = {
  baseUrl: required("BASE_URL"),
  apiBaseUrl: required("API_BASE_URL"),
};
