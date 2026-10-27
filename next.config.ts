import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {source: "/serum/ghk-cu", destination: "/serums/ghk-cu", permanent: true},
      {source: "/en/serum/ghk-cu", destination: "/serums/ghk-cu", permanent: true},
      {source: "/es/serum/ghk-cu", destination: "/es/serums/ghk-cu", permanent: true},
      {source: "/serums/ghk-uk", destination: "/serums/ghk-cu", permanent: true},
      {source: "/serum/ghk-uk", destination: "/serums/ghk-cu", permanent: true},
      {source: "/:locale(en|es)/serums/ghk-uk", destination: "/:locale/serums/ghk-cu", permanent: true},
      {source: "/:locale(en|es)/serum/ghk-uk", destination: "/:locale/serums/ghk-cu", permanent: true},
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
