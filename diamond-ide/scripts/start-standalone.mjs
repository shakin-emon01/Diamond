import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

const args = process.argv.slice(2);

for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  const nextValue = args[index + 1];

  if ((value === "--port" || value === "-p") && nextValue) {
    process.env.PORT = nextValue;
    index += 1;
    continue;
  }

  if ((value === "--hostname" || value === "--host" || value === "-H") && nextValue) {
    process.env.HOSTNAME = nextValue;
    index += 1;
  }
}

process.env.PORT ??= "3000";
process.env.HOSTNAME ??= "0.0.0.0";
process.env.NODE_ENV ??= "production";

mirrorDirectory(path.join(projectRoot, "public"), path.join(standaloneRoot, "public"));
mirrorDirectory(path.join(projectRoot, ".next", "static"), path.join(standaloneRoot, ".next", "static"));

require("../.next/standalone/server.js");

function mirrorDirectory(sourcePath, destinationPath) {
  if (!existsSync(sourcePath)) {
    return;
  }

  mkdirSync(path.dirname(destinationPath), { recursive: true });
  cpSync(sourcePath, destinationPath, { force: true, recursive: true });
}
