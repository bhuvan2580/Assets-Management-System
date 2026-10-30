import {
    LayoutDashboard,
    Package,
    ClipboardList,
    Ticket,
    LogOut,
    X
} from "lucide-react";

import {
    useNavigate,
    useLocation
} from "react-router-dom";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";


function EmployeeSidebar({
    mobileOpen = false,
    onClose
}) {

    const navigate = useNavigate();
    const location = useLocation();

    const {
        logout
    } = useAuth();

    const [showLogoutModal, setShowLogoutModal] =
        useState(false);


    // ============================================================
    // NAVIGATION
    // ============================================================

    const handleNavigate = (path) => {

        navigate(path);

        if (onClose) {
            onClose();
        }
    };


    // ============================================================
    // LOGOUT
    // Same functionality as Admin Sidebar
    // ============================================================

    const handleLogout = () => {

        logout();

        setShowLogoutModal(false);

        if (onClose) {
            onClose();
        }

        navigate("/login", {
            replace: true
        });
    };


    return (
        <>

            {/* =====================================================
                MOBILE OVERLAY
            ===================================================== */}

            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                />
            )}


            {/* =====================================================
                SIDEBAR
            ===================================================== */}

            <aside
                className={`employee-sidebar ${
                    mobileOpen
                        ? "employee-sidebar-mobile-open"
                        : ""
                }`}
            >

                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="employee-sidebar-brand">

                    <div className="employee-sidebar-logo">

                        <img
                            src="/logo.png"
                            alt="Abylle Solutions"
                        />

                    </div>

                    <div className="employee-sidebar-brand-text">

                        <h2>
                            Abylle Solutions
                        </h2>

                        <span>
                            Employee Portal
                        </span>

                    </div>

                </div>


                {/* =================================================
                    NAVIGATION
                ================================================= */}

                <nav className="employee-sidebar-nav">

                    {/* Dashboard */}

                    <EmployeeNavItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={
                            location.pathname ===
                            "/employee/dashboard"
                        }
                        onClick={() =>
                            handleNavigate(
                                "/employee/dashboard"
                            )
                        }
                    />


                    <EmployeeNavItem 
                        icon={Ticket} 
                        label="IT Support Requests" 
                        active={
                            location.pathname === 
                            "/employee/it-requests"
                        } 
                        onClick={() => 
                            handleNavigate("/employee/it-requests"

                            )
                        }
                    />

                    {/* Available Assets */}

                    <EmployeeNavItem
                        icon={Package}
                        label="Request Assets"
                        active={
                            location.pathname ===
                            "/employee/assets"
                        }
                        onClick={() =>
                            handleNavigate(
                                "/employee/assets"
                            )
                        }
                    />

                </nav>


                {/* =================================================
                    BOTTOM
                ================================================= */}

                <div className="employee-sidebar-bottom">

                    <EmployeeNavItem
                        icon={LogOut}
                        label="Logout"
                        onClick={() =>
                            setShowLogoutModal(true)
                        }
                    />

                </div>

            </aside>


            {/* =====================================================
                LOGOUT CONFIRMATION MODAL

                IMPORTANT:
                These class names are intentionally the SAME
                as the Admin Sidebar.
            ===================================================== */}

            {showLogoutModal && (

                <div
                    className="logout-modal-overlay"
                    onClick={() =>
                        setShowLogoutModal(false)
                    }
                >

                    <div
                        className="logout-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* CLOSE BUTTON */}

                        <button
                            className="logout-modal-close"
                            onClick={() =>
                                setShowLogoutModal(false)
                            }
                        >

                            <X size={20} />

                        </button>


                        {/* LOGOUT ICON */}

                        <div className="logout-icon">

                            <LogOut size={24} />

                        </div>


                        {/* CONTENT */}

                        <div className="logout-modal-content">

                            <h3>
                                Logout
                            </h3>

                            <p>
                                Are you sure you want to
                                logout from your account?
                            </p>

                        </div>


                        {/* ACTIONS */}

                        <div className="logout-modal-actions">

                            <button
                                className="logout-cancel-btn"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                            >
                                Cancel
                            </button>


                            <button
                                className="logout-confirm-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </>
    );
}


/* ================================================================
   EMPLOYEE NAV ITEM
================================================================ */

function EmployeeNavItem({
    icon: Icon,
    label,
    active = false,
    onClick
}) {
    return (
        <button
            type="button"
            className={`employee-nav-item ${
                active ? "employee-nav-item-active" : ""
            }`}
            onClick={onClick}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
        >
            <Icon
                size={19}
                aria-hidden="true"
                focusable="false"
            />

            <span>{label}</span>
        </button>
    );
}


export default EmployeeSidebar;