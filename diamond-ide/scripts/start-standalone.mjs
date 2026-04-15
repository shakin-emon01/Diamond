import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

require("../.next/standalone/server.js");
