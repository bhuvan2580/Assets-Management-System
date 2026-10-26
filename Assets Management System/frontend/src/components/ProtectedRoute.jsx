import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
    children,
    allowedRoles = []
}) => {

    const {
        user,
        isAuthenticated
    } = useAuth();

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role)
    ) {

        if (user?.role === "EMPLOYEE") {

            return (
                <Navigate
                    to="/employee"
                    replace
                />
            );
        }

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
};

export default ProtectedRoute;