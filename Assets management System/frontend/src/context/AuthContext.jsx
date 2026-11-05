import {
    createContext,
    useContext,
    useState
} from "react";

import {
    saveAuth,
    getToken,
    getUser,
    clearAuth
} from "../utils/auth";

const AuthContext = createContext(null);

const API_BASE_URL =
    `http://${window.location.hostname}:5000/api`;


export const AuthProvider = ({ children }) => {

    const [token, setToken] = useState(
        getToken()
    );

    const [user, setUserState] = useState(
        getUser()
    );


    /*
     * LOGIN
     *
     * There are now three possible outcomes:
     *
     * 1. Normal login
     *    -> access_token returned
     *
     * 2. Same email exists in users and employees
     *    -> multiple_access returned
     *    -> Login.jsx will show the access-selection popup
     *
     * 3. Login failure
     *    -> error returned
     */
    const login = async (
        email,
        password,
        accountType = null
    ) => {

        const body = {
            email,
            password
        };

        /*
         * account_type is only sent when the user has
         * selected an access type from the popup.
         *
         * Possible values:
         *
         * USER
         * EMPLOYEE
         */
        if (accountType) {

            body.account_type =
                accountType;

        }


        const response = await fetch(
            `${API_BASE_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(body)
            }
        );


        const data =
            await response.json();


        /*
         * Login failed
         */
        if (!response.ok) {

            throw new Error(
                data.message ||
                "Login failed."
            );

        }


        /*
         * ====================================================
         * MULTIPLE ACCESS
         * ====================================================
         *
         * Same email exists in both:
         *
         * users
         * employees
         *
         * Do NOT save authentication yet.
         *
         * Login.jsx will use this information to show
         * the access-selection popup.
         */
        if (
            data.multiple_access === true
        ) {

            return data;

        }


        /*
         * ====================================================
         * NORMAL LOGIN
         * ====================================================
         */

        if (
            !data.success ||
            !data.access_token
        ) {

            throw new Error(
                data.message ||
                "Login failed."
            );

        }


        /*
         * Save authentication
         */
        saveAuth(
            data.access_token,
            data.user
        );


        setToken(
            data.access_token
        );


        setUserState(
            data.user
        );


        return data;
    };


    /*
     * ========================================================
     * UPDATE USER
     * ========================================================
     *
     * Updates:
     *
     * 1. React state
     * 2. localStorage
     */
    const updateUser = (
        updatedUser
    ) => {

        setUserState(
            updatedUser
        );


        /*
         * Keep the existing JWT
         * and replace the stored user.
         */
        if (token) {

            saveAuth(
                token,
                updatedUser
            );

        }

    };


    /*
     * ========================================================
     * LOGOUT
     * ========================================================
     */

    const logout = async () => {

        // Notify the backend while the current JWT is still available so the
        // logout event can be attributed to the signed-in account.
        const currentToken = getToken();
        try {
            if (currentToken) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${currentToken}` },
                });
            }
        } catch (error) {
            // Local logout must still work when the API is temporarily offline.
            console.warn("Could not record logout with the server.", error);
        } finally {
            clearAuth();
            setToken(null);
            setUserState(null);
        }

    };


    return (

        <AuthContext.Provider
            value={{
                token,
                user,

                login,
                logout,

                updateUser,

                isAuthenticated:
                    !!token
            }}
        >

            {children}

        </AuthContext.Provider>

    );

};


export const useAuth = () => {

    const context =
        useContext(AuthContext);


    if (!context) {

        throw new Error(
            "useAuth must be used inside AuthProvider"
        );

    }


    return context;
};