import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import EmployeeSidebar from "../components/EmployeeSidebar";
import Navbar from "../components/Navbar";
import ProtectedRoute from "../components/ProtectedRoute";

import EmployeeDashboard from "../pages/EmployeeDashboard";
import AvailableAssets from "../pages/AvailableAssets";
import AssetRequests from "../pages/AssetRequests";
import ChangePassword from "../pages/ChangePassword";
import EmployeeITRequests from "../pages/EmployeeITRequests";

function EmployeeLayout() {

    const [mobileMenuOpen, setMobileMenuOpen] =
        useState(false);

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <div className="employee-app-layout">

            {/* =====================================================
                EMPLOYEE SIDEBAR
            ===================================================== */}

            <EmployeeSidebar
                mobileOpen={mobileMenuOpen}
                onClose={closeMobileMenu}
            />


            {/* =====================================================
                MAIN AREA
            ===================================================== */}

            <div className="employee-main-area">

                <Navbar
                    onMenuClick={() =>
                        setMobileMenuOpen(
                            (prev) => !prev
                        )
                    }
                />


                {/* =================================================
                    CONTENT
                ================================================= */}

                <main className="employee-content">

                    <Routes>

                        {/* =========================================
                            EMPLOYEE DASHBOARD
                        ========================================= */}

                        <Route
                            path="dashboard"
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        "EMPLOYEE"
                                    ]}
                                >
                                    <EmployeeDashboard />
                                </ProtectedRoute>
                            }
                        />


                        {/* =========================================
                            AVAILABLE ASSETS
                        ========================================= */}

                        <Route
                            path="assets"
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        "EMPLOYEE"
                                    ]}
                                >
                                    <AvailableAssets />
                                </ProtectedRoute>
                            }
                        />


                        {/* =========================================
                            MY REQUESTS
                        ========================================= */}

                        <Route
                            path="requests"
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        "EMPLOYEE"
                                    ]}
                                >
                                    <AssetRequests />
                                </ProtectedRoute>
                            }
                        />

                        {/* =========================================
                                IT SUPPORT REQUESTS
                            ========================================= */}

                        <Route
                            path="it-requests"
                            element={
                                <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
                                    <EmployeeITRequests />
                                </ProtectedRoute>
                            }
                        />


                        {/* =========================================
                            CHANGE PASSWORD
                        ========================================= */}

                        <Route
                            path="change-password"
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        "EMPLOYEE"
                                    ]}
                                >
                                    <ChangePassword />
                                </ProtectedRoute>
                            }
                        />


                        {/* =========================================
                            DEFAULT EMPLOYEE PAGE
                        ========================================= */}

                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to="/employee/dashboard"
                                    replace
                                />
                            }
                        />

                    </Routes>

                </main>

            </div>

        </div>
    );
}

export default EmployeeLayout;