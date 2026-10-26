import axios from "axios";
import { getToken, clearAuth } from "../utils/auth";

const api = axios.create({
    baseURL: "http://127.0.0.1:5000/api",
});


// ============================================================
// REQUEST INTERCEPTOR
// Attach JWT token to every API request
// ============================================================

api.interceptors.request.use(
    (config) => {

        const token = getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


// ============================================================
// RESPONSE INTERCEPTOR
// Handle expired / invalid JWT
// ============================================================

api.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {

        if (error.response?.status === 401) {

            console.warn(
                "Authentication expired or invalid."
            );

            clearAuth();

            // Redirect to login
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);


export default api;