import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://127.0.0.1:5000/api";

function ChangePassword() {

    const navigate = useNavigate();

    const {
        token,
        user,
        updateUser
    } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const requirements = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password)
    };

    const strongPassword =
        requirements.length &&
        requirements.uppercase &&
        requirements.lowercase &&
        requirements.number &&
        requirements.symbol;

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (!strongPassword) {
            setError(
                "Please meet all password requirements."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError(
                "Passwords do not match."
            );
            return;
        }

        try {

            setLoading(true);

            const response = await fetch(
                `${API_BASE_URL}/auth/change-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        new_password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to change password."
                );
            }

            const updatedUser = {
                ...user,
                must_change_password: false
            };

            updateUser(updatedUser);

            setSuccess(
                "Password changed successfully."
            );

            setTimeout(() => {

                if (user?.role === "EMPLOYEE") {

                    navigate(
                        "/employee/dashboard",
                        { replace: true }
                    );

                } else {

                    navigate(
                        "/",
                        { replace: true }
                    );

                }

            }, 800);

        } catch (error) {

            setError(
                error.message ||
                "Unable to change password."
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="change-password-page">

            <div className="change-password-card">

                <div className="change-password-brand">

                    <div className="change-password-logo">

                        <img
                            src="/logo.png"
                            alt="Abylle Solutions"
                        />

                    </div>

                    <h1>
                        Change Your Password
                    </h1>

                    <p>
                        You are using a temporary password.
                        Please create a new password to continue.
                    </p>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="change-password-form"
                >

                    {/* NEW PASSWORD */}

                    <div className="change-password-field">

                        <label>
                            New Password
                        </label>

                        <div className="password-input-wrapper">

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
                                onFocus={() => { }}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                            >
                                {showPassword
                                    ? <EyeOff size={19} />
                                    : <Eye size={19} />
                                }
                            </button>

                        </div>


                        {/* PASSWORD REQUIREMENTS */}

                        <div className="password-requirements">

                            {!requirements.length && (
                                <Requirement
                                    valid={false}
                                    text="At least 12 characters"
                                />
                            )}

                            {!requirements.uppercase && (
                                <Requirement
                                    valid={false}
                                    text="At least one uppercase letter"
                                />
                            )}

                            {!requirements.lowercase && (
                                <Requirement
                                    valid={false}
                                    text="At least one lowercase letter"
                                />
                            )}

                            {!requirements.number && (
                                <Requirement
                                    valid={false}
                                    text="At least one number"
                                />
                            )}

                            {!requirements.symbol && (
                                <Requirement
                                    valid={false}
                                    text="At least one special character"
                                />
                            )}

                        </div>

                    </div>


                    {/* CONFIRM PASSWORD */}

                    <div className="change-password-field">

                        <label>
                            Confirm Password
                        </label>

                        <div className="password-input-wrapper">

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
                                onClick={() =>
                                    setShowConfirmPassword(
                                        !showConfirmPassword
                                    )
                                }
                            >
                                {showConfirmPassword
                                    ? <EyeOff size={19} />
                                    : <Eye size={19} />
                                }
                            </button>

                        </div>

                    </div>


                    {/* ERROR */}

                    {error && (
                        <div className="change-password-error">
                            {error}
                        </div>
                    )}


                    {/* SUCCESS */}

                    {success && (
                        <div className="change-password-success">
                            {success}
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={
                            loading ||
                            !strongPassword ||
                            password !== confirmPassword
                        }
                        className="change-password-button"
                    >

                        {loading
                            ? "Updating Password..."
                            : "Set New Password"
                        }

                    </button>

                </form>

            </div>

        </div>
    );
}


function Requirement({
    valid,
    text
}) {

    return (
        <div className="password-requirement">

            {valid
                ? (
                    <CheckCircle size={16} />
                )
                : (
                    <XCircle size={16} />
                )
            }

            <span>
                {text}
            </span>

        </div>
    );
}


export default ChangePassword;