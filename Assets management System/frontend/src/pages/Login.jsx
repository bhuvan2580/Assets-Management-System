import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /*
     * ========================================================
     * ACCESS SELECTION
     * ========================================================
     *
     * When the same email exists in both:
     *
     * users
     * employees
     *
     * the backend returns multiple_access = true.
     *
     * We temporarily store the available choices here.
     */

    const [showAccessModal, setShowAccessModal] =
        useState(false);

    const [accessOptions, setAccessOptions] =
        useState([]);

    const [accessLoading, setAccessLoading] =
        useState(false);


    /*
     * ========================================================
     * GET FRIENDLY ROLE NAME
     * ========================================================
     */

    const getRoleLabel = (role) => {

        switch (role) {

            case "SUPERUSER":
                return "Superuser Access";

            case "ADMIN":
                return "Admin Access";

            case "IT":
                return "IT Access";

            case "EMPLOYEE":
                return "Employee Access";

            default:
                return "System Access";
        }
    };


    /*
     * ========================================================
     * NAVIGATE AFTER LOGIN
     * ========================================================
     */

    const handleSuccessfulLogin = (data) => {

        const role =
            data?.user?.role;

        if (role === "EMPLOYEE") {

            navigate(
                "/employee/dashboard"
            );

            return;
        }


        if (
            role === "ADMIN" ||
            role === "IT" ||
            role === "SUPERUSER"
        ) {

            navigate("/");

            return;
        }


        setError(
            "Your account does not have a valid role."
        );
    };


    /*
     * ========================================================
     * NORMAL LOGIN
     * ========================================================
     */

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");

        if (!email || !password) {

            setError(
                "Please enter your email and password."
            );

            return;
        }


        try {

            setLoading(true);


            const data = await login(
                email.trim().toLowerCase(),
                password
            );


            /*
             * =================================================
             * SAME EMAIL EXISTS IN BOTH TABLES
             * =================================================
             */

            if (
                data?.multiple_access === true
            ) {

                setAccessOptions(
                    data.access_options || []
                );

                setShowAccessModal(true);

                return;
            }


            /*
             * =================================================
             * NORMAL LOGIN
             * =================================================
             */

            handleSuccessfulLogin(data);

        } catch (error) {

            setError(
                error.message ||
                "Unable to login."
            );

        } finally {

            setLoading(false);
        }
    };


    /*
     * ========================================================
     * SELECT ACCESS TYPE
     * ========================================================
     */

    const handleAccessSelection = async (
        accountType
    ) => {

        setError("");
        setAccessLoading(true);


        try {

            const data = await login(
                email.trim().toLowerCase(),
                password,
                accountType
            );


            /*
             * The second request must return a real
             * authentication token.
             */

            if (
                !data ||
                !data.access_token
            ) {

                throw new Error(
                    data?.message ||
                    "Unable to authenticate with the selected access."
                );
            }


            setShowAccessModal(false);

            setAccessOptions([]);

            handleSuccessfulLogin(data);

        } catch (error) {

            setError(
                error.message ||
                "Unable to login with the selected access."
            );

        } finally {

            setAccessLoading(false);
        }
    };


    /*
     * ========================================================
     * CLOSE ACCESS MODAL
     * ========================================================
     */

    const closeAccessModal = () => {

        if (accessLoading) {
            return;
        }

        setShowAccessModal(false);

        setAccessOptions([]);

        setError("");
    };


    /*
     * ========================================================
     * UI
     * ========================================================
     */

    return (

        <div className="login-page">

            <div className="login-card">

                {/* Logo / Brand */}

                <div className="login-brand">

                    <div className="login-logo">

                        <img
                            src="/logo.png"
                            alt="Abylle Solutions"
                        />

                    </div>

                    <h1>
                        Abylle Solutions
                    </h1>

                    <p>
                        IT Asset Management System
                    </p>

                </div>


                {/* Login Form */}

                <form
                    onSubmit={handleSubmit}
                    className="login-form"
                >

                    {/* Email */}

                    <div className="login-field">

                        <label>
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            disabled={loading}
                        />

                    </div>


                    {/* Password */}

                    <div className="login-field">

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            disabled={loading}
                        />

                    </div>


                    {/* Error */}

                    {error && (

                        <div className="login-error">

                            <p>
                                {error}
                            </p>

                        </div>

                    )}


                    {/* Submit */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-button"
                    >

                        {loading
                            ? "Signing in..."
                            : "Sign In"
                        }

                    </button>


                    {/* Forgot Password */}

                    <div className="forgot-password-link-container">

                        <button
                            type="button"
                            className="forgot-password-link"
                            onClick={() =>
                                navigate(
                                    "/forgot-password"
                                )
                            }
                        >
                            Forgot Password?
                        </button>

                    </div>

                </form>

            </div>


            {/* ==================================================
                ACCESS SELECTION MODAL
            ================================================== */}

            {showAccessModal && (

                <div
                    className="login-access-overlay"
                    onClick={closeAccessModal}
                >

                    <div
                        className="login-access-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* Header */}

                        <div className="login-access-header">

                            <h2>
                                Select Access
                            </h2>

                            <p>
                                This email has more than one
                                type of access.
                            </p>

                        </div>


                        {/* Access Options */}

                        <div className="login-access-options">

                            {accessOptions.map(
                                (option, index) => (

                                    <button
                                        key={
                                            `${option.access_type}-${index}`
                                        }
                                        type="button"
                                        className="login-access-option"
                                        disabled={
                                            accessLoading
                                        }
                                        onClick={() =>
                                            handleAccessSelection(
                                                option.access_type
                                            )
                                        }
                                    >

                                        <div className="login-access-option-content">

                                            <strong>
                                                {
                                                    getRoleLabel(
                                                        option.role
                                                    )
                                                }
                                            </strong>

                                            {option.role !==
                                                "EMPLOYEE" && (
                                                    <span>
                                                        System Management
                                                        Access
                                                    </span>
                                                )}

                                            {option.role ===
                                                "EMPLOYEE" && (
                                                    <span>
                                                        Employee Portal
                                                    </span>
                                                )}

                                        </div>

                                        <span className="login-access-arrow">
                                            →
                                        </span>

                                    </button>

                                )
                            )}

                        </div>


                        {/* Loading */}

                        {accessLoading && (

                            <div className="login-access-loading">

                                Signing in...

                            </div>

                        )}


                        {/* Cancel */}

                        {!accessLoading && (

                            <button
                                type="button"
                                className="login-access-cancel"
                                onClick={
                                    closeAccessModal
                                }
                            >
                                Cancel
                            </button>

                        )}

                    </div>

                </div>

            )}

        </div>
    );
};

export default Login;