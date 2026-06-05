import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA({
  dest: "public",
  disable: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/push-sw.js"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/pai-jeronimo\.vercel\.app\/api\/chat/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-chat",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/pai-jeronimo\.vercel\.app\/api\/drive/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-drive",
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
})(nextConfig);
