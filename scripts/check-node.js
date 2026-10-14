const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error(`Node.js 22 or newer is required. This machine is running ${process.version}.`);
  console.error("Install it from https://nodejs.org and open a new terminal.");
  console.error("If you use nvm: nvm install 22 && nvm use");
  process.exit(1);
}
