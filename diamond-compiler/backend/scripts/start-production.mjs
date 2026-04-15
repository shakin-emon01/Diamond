import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

process.env.NODE_ENV ??= "production";

require("../src/server.js");
