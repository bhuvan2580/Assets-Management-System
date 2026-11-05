import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: "autoUpdate",

            includeAssets: [
                "favicon.svg",
                "robots.txt"
            ],

            manifest: {
                name: "Abylle Solutions IT Asset Management",
                short_name: "Abylle Assets",
                description:
                    "IT Asset Management System for Abylle Solutions",

                theme_color: "#111827",
                background_color: "#f7f8fa",

                display: "standalone",

                start_url: "/",
                scope: "/",

                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable"
                    }
                ]
            },

            workbox: {
                cleanupOutdatedCaches: true,

                runtimeCaching: [
                    {
                        urlPattern:
                            /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,

                        handler: "CacheFirst",

                        options: {
                            cacheName: "google-fonts",

                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },

                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ]
});