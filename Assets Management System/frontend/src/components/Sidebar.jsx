import {
    LayoutDashboard,
    Package,
    Users,
    Building2,
    ArrowLeftRight,
    History,
    LogOut,
    X,
    UserCog,
    ClipboardList,
} from "lucide-react";

import {
    useNavigate,
    useLocation,
} from "react-router-dom";

import { useState } from "react";

import { useAuth } from "../context/AuthContext";


function Sidebar({
    mobileOpen = false,
    onClose
}) {

    const navigate = useNavigate();
    const location = useLocation();

    const {
        logout,
        user
    } = useAuth();

    const [showLogoutModal, setShowLogoutModal] =
        useState(false);


    // ============================================================
    // CURRENT USER ROLE
    // ============================================================

    const userRole = user?.role;


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


    // ============================================================
    // ROLE PERMISSIONS
    // ============================================================

    // Only ADMIN and SUPERUSER can manage accounts
    const canManageUsers =
        userRole === "ADMIN" ||
        userRole === "SUPERUSER";


    // ADMIN / SUPERUSER / IT can manage asset requests
    const canManageRequests =
        userRole === "ADMIN" ||
        userRole === "SUPERUSER" ||
        userRole === "IT";


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
                className={`sidebar ${mobileOpen
                    ? "mobile-open"
                    : ""
                    }`}
            >


                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="brand">

                    <div className="brand-logo">

                        <img
                            src="/logo.png"
                            alt="Abylle Solutions"
                        />

                    </div>

                    <div>

                        <h2>
                            Abylle Solutions
                        </h2>

                        <span>
                            IT Asset Management
                        </span>

                    </div>

                </div>


                {/* =================================================
                    NAVIGATION
                ================================================= */}

                <nav className="sidebar-nav">


                    {/* =================================================
                        DASHBOARD
                    ================================================= */}

                    <NavItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={
                            location.pathname === "/"
                        }
                        onClick={() =>
                            handleNavigate("/")
                        }
                    />

                    {/* =================================================
                        ASSIGNMENTS
                    ================================================= */}

                    <NavItem
                        icon={ArrowLeftRight}
                        label="Assignments"
                        active={
                            location.pathname.startsWith(
                                "/assignments"
                            )
                        }
                        onClick={() =>
                            handleNavigate("/assignments")
                        }
                    />


                    {/* =================================================
                        ASSET REQUESTS

                        ADMIN / SUPERUSER / IT
                    ================================================= */}

                    {canManageRequests && (
                        <NavItem
                            icon={ClipboardList}
                            label="Asset Requests"
                            active={
                                location.pathname.startsWith(
                                    "/requests"
                                )
                            }
                            onClick={() =>
                                handleNavigate("/requests")
                            }
                        />
                    )}


                    {/* =================================================
                        ASSETS
                    ================================================= */}

                    <NavItem
                        icon={Package}
                        label="Assets"
                        active={
                            location.pathname.startsWith(
                                "/assets"
                            )
                        }
                        onClick={() =>
                            handleNavigate("/assets")
                        }
                    />


                    {/* =================================================
                        EMPLOYEES
                    ================================================= */}

                    <NavItem
                        icon={Users}
                        label="Employees"
                        active={
                            location.pathname.startsWith(
                                "/employees"
                            )
                        }
                        onClick={() =>
                            handleNavigate("/employees")
                        }
                    />


                    {/* =================================================
                        VENDORS
                    ================================================= */}

                    <NavItem
                        icon={Building2}
                        label="Vendors"
                        active={
                            location.pathname.startsWith(
                                "/vendors"
                            )
                        }
                        onClick={() =>
                            handleNavigate("/vendors")
                        }
                    />


                    {/* =================================================
                        ASSET HISTORY
                    ================================================= */}

                    <NavItem
                        icon={History}
                        label="Asset History"
                        active={
                            location.pathname.startsWith(
                                "/asset-history"
                            )
                        }
                        onClick={() =>
                            handleNavigate(
                                "/asset-history"
                            )
                        }
                    />


                    {/* =================================================
                        USER MANAGEMENT

                        ADMIN + SUPERUSER ONLY
                    ================================================= */}

                    {canManageUsers && (
                        <NavItem
                            icon={UserCog}
                            label="User Management"
                            active={
                                location.pathname.startsWith(
                                    "/users"
                                )
                            }
                            onClick={() =>
                                handleNavigate("/users")
                            }
                        />
                    )}

                </nav>


                {/* =================================================
                    SIDEBAR BOTTOM
                ================================================= */}

                <div className="sidebar-bottom">

                    <NavItem
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
            ================================================= */}

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
   NAV ITEM
================================================================ */

function NavItem({
    icon: Icon,
    label,
    active = false,
    onClick
}) {
    return (
        <button
            type="button"
            className={`nav-item ${active ? "active" : ""}`}
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

            <span>
                {label}
            </span>
        </button>
    );
}


export default Sidebar;