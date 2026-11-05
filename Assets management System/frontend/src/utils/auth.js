const TOKEN_KEY = "asset_management_token";
const USER_KEY = "asset_management_user";

export const saveAuth = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
    const user = localStorage.getItem(USER_KEY);

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch {
        return null;
    }
};

export const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
    return !!getToken();
};