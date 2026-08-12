import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // pdfkit resolves its font-metrics files via `path.join(__dirname, ...)`
  // relative to its OWN module location at require-time. If Turbopack/Webpack
  // bundles it, that __dirname gets rewritten to the bundle's virtual path
  // and the real .afm files can no longer be found (ENOENT). Keeping it
  // external forces a native Node `require`, so __dirname stays real.
  serverExternalPackages: ["pdfkit"],
  // The SQLite file is opened via a runtime-constructed path
  // (path.join(process.cwd(), "data", "app.db")), which Vercel's build-time
  // file tracer can't detect through static analysis alone — without this,
  // server actions (like the login action) get deployed without data/app.db
  // in their function bundle and crash with SQLITE_CANTOPEN on every call.
  // pdfkit loads its standard-14 font metrics (.afm files) from disk at
  // runtime via a relative path — same class of problem as the SQLite file
  // below: the build-time tracer can't see it, so the report route would
  // crash on Vercel without this.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*", "./node_modules/pdfkit/js/data/**/*"],
    "/**": ["./data/**/*", "./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
