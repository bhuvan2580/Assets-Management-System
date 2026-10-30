import { registerSW } from "virtual:pwa-register";

registerSW({
    immediate: true,

    onRegisteredSW(swUrl, registration) {
        console.log(
            "PWA service worker registered:",
            swUrl
        );
    },

    onOfflineReady() {
        console.log(
            "Abylle Solutions is ready to work offline."
        );
    },

    onNeedRefresh() {
        console.log(
            "A new version of Abylle Solutions is available."
        );
    },

    onRegisterError(error) {
        console.error(
            "PWA registration failed:",
            error
        );
    }
});