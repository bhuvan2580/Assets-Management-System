import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Mail,
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
    Check,
    X
} from "lucide-react";


const API_BASE_URL = "http://127.0.0.1:5000/api";


const ForgotPassword = () => {

    const navigate = useNavigate();


    // ============================================================
    // STEP
    // ============================================================

    const [step, setStep] = useState(1);


    // ============================================================
    // FORM DATA
    // ============================================================

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");


    // ============================================================
    // UI STATE
    // ============================================================

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [passwordFocused, setPasswordFocused] =
        useState(false);


    // ============================================================
    // PASSWORD REQUIREMENTS
    // ============================================================

    const passwordRequirements = {

        length:
            password.length >= 12,

        uppercase:
            /[A-Z]/.test(password),

        lowercase:
            /[a-z]/.test(password),

        number:
            /[0-9]/.test(password),

        symbol:
            /[^A-Za-z0-9]/.test(password)

    };


    const passwordValid =
        passwordRequirements.length &&
        passwordRequirements.uppercase &&
        passwordRequirements.lowercase &&
        passwordRequirements.number &&
        passwordRequirements.symbol;


    const passwordsMatch =
        password.length > 0 &&
        password === confirmPassword;


    // ============================================================
    // CLEAR MESSAGES
    // ============================================================

    const clearMessages = () => {

        setError("");
        setSuccess("");

    };


    // ============================================================
    // SEND OTP
    // ============================================================

    const handleSendOTP = async (e) => {

        e.preventDefault();

        clearMessages();


        if (!email.trim()) {

            setError(
                "Please enter your email address."
            );

            return;
        }


        try {

            setLoading(true);


            const response = await fetch(
                `${API_BASE_URL}/auth/forgot-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email: email.trim()
                    })
                }
            );


            const data = await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Unable to send OTP."
                );

            }


            setSuccess(
                "OTP has been sent to your registered email address."
            );


            setStep(2);


        } catch (error) {

            setError(
                error.message ||
                "Unable to send OTP."
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // VERIFY OTP
    // ============================================================

    const handleVerifyOTP = async (e) => {

        e.preventDefault();

        clearMessages();


        if (!otp.trim()) {

            setError(
                "Please enter the OTP."
            );

            return;
        }


        if (!/^\d{6}$/.test(otp.trim())) {

            setError(
                "OTP must contain 6 digits."
            );

            return;
        }


        try {

            setLoading(true);


            /*
             * IMPORTANT:
             *
             * Backend endpoint is:
             *
             * /auth/verify-otp
             *
             * NOT:
             *
             * /auth/verify-reset-otp
             */

            const response = await fetch(
                `${API_BASE_URL}/auth/verify-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email: email.trim(),
                        otp: otp.trim()
                    })
                }
            );


            const data = await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Invalid OTP."
                );

            }


            setSuccess(
                "OTP verified successfully."
            );


            setStep(3);


        } catch (error) {

            setError(
                error.message ||
                "Unable to verify OTP."
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // RESET PASSWORD
    // ============================================================

    const handleResetPassword = async (e) => {

        e.preventDefault();

        clearMessages();


        if (!passwordValid) {

            setError(
                "Please satisfy all password requirements."
            );

            return;
        }


        if (!passwordsMatch) {

            setError(
                "Passwords do not match."
            );

            return;
        }


        try {

            setLoading(true);


            /*
             * IMPORTANT:
             *
             * Backend expects:
             *
             * email
             * otp
             * new_password
             *
             * The OTP must be sent again because
             * the backend consumes it only after
             * the password reset succeeds.
             */

            const response = await fetch(
                `${API_BASE_URL}/auth/reset-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        email: email.trim(),

                        otp: otp.trim(),

                        new_password: password

                    })
                }
            );


            const data = await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Unable to reset password."
                );

            }


            setSuccess(
                "Password reset successfully. You can now log in."
            );


            setTimeout(() => {

                navigate("/login");

            }, 1500);


        } catch (error) {

            setError(
                error.message ||
                "Unable to reset password."
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // BACK TO LOGIN
    // ============================================================

    const handleBackToLogin = () => {

        navigate("/login");

    };


    // ============================================================
    // PASSWORD REQUIREMENT
    // ============================================================

    const Requirement = ({
        valid,
        children
    }) => {

        return (

            <div
                className={
                    `password-requirement ${
                        valid
                            ? "valid"
                            : "invalid"
                    }`
                }
            >

                <span className="requirement-icon">

                    {valid ? (
                        <Check size={14} />
                    ) : (
                        <X size={14} />
                    )}

                </span>

                <span>
                    {children}
                </span>

            </div>

        );

    };


    // ============================================================
    // PAGE
    // ============================================================

    return (

        <div className="forgot-password-page">

            <div className="forgot-password-card">


                {/* ==================================================
                    BRAND
                ================================================== */}

                <div className="forgot-password-brand">

                    <div className="forgot-password-logo">

                        <img
                            src="/logo.png"
                            alt="Abylle Solutions"
                        />

                    </div>


                    <h1>
                        Abylle Solutions
                    </h1>


                    <p>
                        Reset your password
                    </p>

                </div>


                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <div className="forgot-password-progress">

                    <div
                        className={
                            `progress-step ${
                                step >= 1
                                    ? "active"
                                    : ""
                            }`
                        }
                    >

                        <span>
                            1
                        </span>

                        <p>
                            Email
                        </p>

                    </div>


                    <div className="progress-line" />


                    <div
                        className={
                            `progress-step ${
                                step >= 2
                                    ? "active"
                                    : ""
                            }`
                        }
                    >

                        <span>
                            2
                        </span>

                        <p>
                            Verify
                        </p>

                    </div>


                    <div className="progress-line" />


                    <div
                        className={
                            `progress-step ${
                                step >= 3
                                    ? "active"
                                    : ""
                            }`
                        }
                    >

                        <span>
                            3
                        </span>

                        <p>
                            Password
                        </p>

                    </div>

                </div>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (

                    <div className="forgot-password-error">

                        <X size={18} />

                        <p>
                            {error}
                        </p>

                    </div>

                )}


                {/* ==================================================
                    SUCCESS
                ================================================== */}

                {success && (

                    <div className="forgot-password-success">

                        <Check size={18} />

                        <p>
                            {success}
                        </p>

                    </div>

                )}


                {/* ==================================================
                    STEP 1
                ================================================== */}

                {step === 1 && (

                    <form
                        className="forgot-password-form"
                        onSubmit={handleSendOTP}
                    >

                        <div className="forgot-step-icon">

                            <Mail size={25} />

                        </div>


                        <div className="forgot-step-heading">

                            <h2>
                                Forgot Password?
                            </h2>

                            <p>
                                Enter your registered email
                                address and we'll send you
                                a verification OTP.
                            </p>

                        </div>


                        <div className="login-field">

                            <label>
                                Email
                            </label>


                            <div className="input-with-icon">

                                <Mail size={18} />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                />

                            </div>

                        </div>


                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >

                            {loading
                                ? "Sending OTP..."
                                : "Send OTP"
                            }

                        </button>

                    </form>

                )}


                {/* ==================================================
                    STEP 2
                ================================================== */}

                {step === 2 && (

                    <form
                        className="forgot-password-form"
                        onSubmit={handleVerifyOTP}
                    >

                        <div className="forgot-step-icon">

                            <ShieldCheck size={25} />

                        </div>


                        <div className="forgot-step-heading">

                            <h2>
                                Verify OTP
                            </h2>

                            <p>
                                Enter the 6-digit OTP sent
                                to your email address.
                            </p>

                        </div>


                        <div className="otp-email">

                            <Mail size={16} />

                            <span>
                                {email}
                            </span>

                        </div>


                        <div className="login-field">

                            <label>
                                Verification Code
                            </label>


                            <input
                                type="text"
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(
                                                /\D/g,
                                                ""
                                            )
                                            .slice(
                                                0,
                                                6
                                            )
                                    )
                                }
                                placeholder="Enter 6-digit OTP"
                                inputMode="numeric"
                                maxLength={6}
                                autoComplete="one-time-code"
                                className="otp-input"
                            />

                        </div>


                        <button
                            type="submit"
                            className="login-button"
                            disabled={
                                loading ||
                                otp.length !== 6
                            }
                        >

                            {loading
                                ? "Verifying..."
                                : "Verify OTP"
                            }

                        </button>


                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {

                                clearMessages();

                                setOtp("");

                                setStep(1);

                            }}
                        >
                            Change Email
                        </button>

                    </form>

                )}


                {/* ==================================================
                    STEP 3
                ================================================== */}

                {step === 3 && (

                    <form
                        className="forgot-password-form"
                        onSubmit={handleResetPassword}
                    >

                        <div className="forgot-step-icon">

                            <Lock size={25} />

                        </div>


                        <div className="forgot-step-heading">

                            <h2>
                                Create New Password
                            </h2>

                            <p>
                                Create a strong password
                                for your account.
                            </p>

                        </div>


                        {/* ==================================================
                            NEW PASSWORD
                        ================================================== */}

                        <div className="login-field">

                            <label>
                                New Password
                            </label>


                            <div className="password-input-wrapper">

                                <Lock size={18} />


                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    onFocus={() =>
                                        setPasswordFocused(
                                            true
                                        )
                                    }
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (prev) =>
                                                !prev
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >

                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}

                                </button>

                            </div>


                            {/* ==================================================
                                PASSWORD REQUIREMENTS
                            ================================================== */}

                            {passwordFocused &&
                                !passwordValid && (

                                <div className="password-requirements">

                                    <p className="requirements-title">
                                        Password must contain:
                                    </p>


                                    {!passwordRequirements.length && (

                                        <Requirement valid={false}>
                                            At least 12 characters
                                        </Requirement>

                                    )}


                                    {!passwordRequirements.uppercase && (

                                        <Requirement valid={false}>
                                            One uppercase letter
                                        </Requirement>

                                    )}


                                    {!passwordRequirements.lowercase && (

                                        <Requirement valid={false}>
                                            One lowercase letter
                                        </Requirement>

                                    )}


                                    {!passwordRequirements.number && (

                                        <Requirement valid={false}>
                                            One number
                                        </Requirement>

                                    )}


                                    {!passwordRequirements.symbol && (

                                        <Requirement valid={false}>
                                            One special character
                                        </Requirement>

                                    )}

                                </div>

                            )}

                        </div>


                        {/* ==================================================
                            CONFIRM PASSWORD
                        ================================================== */}

                        <div className="login-field">

                            <label>
                                Confirm Password
                            </label>


                            <div className="password-input-wrapper">

                                <Lock size={18} />


                                <input
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (prev) =>
                                                !prev
                                        )
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >

                                    {showConfirmPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}

                                </button>

                            </div>


                            {confirmPassword.length > 0 && (

                                <div
                                    className={
                                        `password-match ${
                                            passwordsMatch
                                                ? "valid"
                                                : "invalid"
                                        }`
                                    }
                                >

                                    {passwordsMatch ? (
                                        <Check size={15} />
                                    ) : (
                                        <X size={15} />
                                    )}

                                    {passwordsMatch
                                        ? "Passwords match"
                                        : "Passwords do not match"
                                    }

                                </div>

                            )}

                        </div>


                        <button
                            type="submit"
                            className="login-button"
                            disabled={
                                loading ||
                                !passwordValid ||
                                !passwordsMatch
                            }
                        >

                            {loading
                                ? "Resetting Password..."
                                : "Reset Password"
                            }

                        </button>

                    </form>

                )}


                {/* ==================================================
                    BACK TO LOGIN
                ================================================== */}

                <button
                    type="button"
                    className="back-to-login"
                    onClick={handleBackToLogin}
                >

                    <ArrowLeft size={17} />

                    Back to Login

                </button>


            </div>

        </div>

    );

};


export default ForgotPassword;