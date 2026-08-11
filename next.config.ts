import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The SQLite file is opened via a runtime-constructed path
  // (path.join(process.cwd(), "data", "app.db")), which Vercel's build-time
  // file tracer can't detect through static analysis alone — without this,
  // server actions (like the login action) get deployed without data/app.db
  // in their function bundle and crash with SQLITE_CANTOPEN on every call.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
