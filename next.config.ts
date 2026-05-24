import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.yahoo.com" },
      { protocol: "https", hostname: "**.google.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
