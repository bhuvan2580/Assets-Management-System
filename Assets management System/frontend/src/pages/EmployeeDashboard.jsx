import { useEffect, useState } from "react";

import {
    User,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Ban,
    CalendarDays,
    Mail,
    Building2,
    BriefcaseBusiness,
    RefreshCw,
    AlertCircle
} from "lucide-react";

import api from "../services/api";


function EmployeeDashboard() {

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // ============================================================
    // LOAD DASHBOARD
    // ============================================================

    const loadDashboard = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await api.get(
                "/employee/dashboard"
            );

            setDashboard(
                response.data
            );

        } catch (error) {

            console.error(
                "Failed to load employee dashboard:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load dashboard."
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        loadDashboard();

    }, []);


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="employee-dashboard-loading">

                <RefreshCw
                    size={20}
                    className="employee-loading-icon"
                />

                <span>
                    Loading dashboard...
                </span>

            </div>

        );
    }


    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (

            <div className="employee-error-wrapper">

                <div className="employee-error-card">

                    <div className="employee-error-icon">

                        <AlertCircle
                            size={22}
                        />

                    </div>

                    <div>

                        <h2>
                            Unable to load dashboard
                        </h2>

                        <p>
                            {error}
                        </p>

                        <button
                            onClick={loadDashboard}
                            className="employee-retry-button"
                        >

                            <RefreshCw
                                size={16}
                            />

                            Try again

                        </button>

                    </div>

                </div>

            </div>

        );
    }


    if (!dashboard) {
        return null;
    }


    // ============================================================
    // DATA
    // ============================================================

    const employee =
        dashboard.employee || {};

    const stats =
        dashboard.stats || {};

    const recentAssets =
        dashboard.recent_assets || [];

    const recentRequests =
        dashboard.recent_requests || [];


    // ============================================================
    // REQUEST STATUS
    // ============================================================

    const requestStatus = (status) => {

        const normalized =
            String(status || "").toUpperCase();


        if (normalized === "APPROVED") {

            return (

                <span className="employee-status approved">

                    <CheckCircle size={13} />

                    Approved

                </span>

            );
        }


        if (normalized === "REJECTED") {

            return (

                <span className="employee-status rejected">

                    <XCircle size={13} />

                    Rejected

                </span>

            );
        }


        if (normalized === "CANCELLED") {

            return (

                <span className="employee-status cancelled">

                    <Ban size={13} />

                    Cancelled

                </span>

            );
        }


        return (

            <span className="employee-status pending">

                <Clock size={13} />

                Pending

            </span>

        );
    };


    // ============================================================
    // DATE FORMATTER
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        try {

            return new Date(date).toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

        } catch {

            return date;

        }
    };


    // ============================================================
    // DASHBOARD
    // ============================================================

    return (

        <div className="employee-dashboard">


            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <div className="employee-dashboard-header">

                <div>

                    <p className="employee-page-label">
                        Employee Portal
                    </p>

                    <h1>
                        Welcome, {employee.name || "Employee"}
                    </h1>

                    <p className="employee-page-description">
                        Here's an overview of your assets and requests.
                    </p>

                </div>


                <button
                    onClick={loadDashboard}
                    className="employee-refresh-button"
                >

                    <RefreshCw size={16} />

                    Refresh

                </button>

            </div>


            {/* ================================================= */}
            {/* EMPLOYEE PROFILE */}
            {/* ================================================= */}

            <div className="employee-profile-card">

                <div className="employee-profile-main">

                    <div className="employee-profile-identity">

                        <div className="employee-profile-icon">

                            <User size={27} />

                        </div>

                        <div>

                            <h2>
                                {employee.name}
                            </h2>

                            <p>
                                {employee.employee_id}
                            </p>

                        </div>

                    </div>


                    <div className="employee-profile-details">


                        {/* EMAIL */}

                        <div className="employee-profile-detail">

                            <Mail size={16} />

                            <div>

                                <p>
                                    Email
                                </p>

                                <strong>
                                    {employee.email || "-"}
                                </strong>

                            </div>

                        </div>


                        {/* DEPARTMENT */}

                        <div className="employee-profile-detail">

                            <Building2 size={16} />

                            <div>

                                <p>
                                    Department
                                </p>

                                <strong>
                                    {employee.department || "-"}
                                </strong>

                            </div>

                        </div>


                        {/* DESIGNATION */}

                        <div className="employee-profile-detail">

                            <BriefcaseBusiness size={16} />

                            <div>

                                <p>
                                    Designation
                                </p>

                                <strong>
                                    {employee.designation || "-"}
                                </strong>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* ================================================= */}
            {/* STAT CARDS */}
            {/* ================================================= */}

            <div className="employee-stats-grid">


                {/* ASSIGNED */}

                <div className="employee-stat-card">

                    <div>

                        <p>
                            Assigned Assets
                        </p>

                        <h2>
                            {stats.assigned_assets ?? 0}
                        </h2>

                    </div>

                    <div className="employee-stat-icon blue">

                        <Package size={21} />

                    </div>

                </div>


                {/* PENDING */}

                <div className="employee-stat-card">

                    <div>

                        <p>
                            Pending Requests
                        </p>

                        <h2>
                            {stats.pending_requests ?? 0}
                        </h2>

                    </div>

                    <div className="employee-stat-icon yellow">

                        <Clock size={21} />

                    </div>

                </div>


                {/* APPROVED */}

                <div className="employee-stat-card">

                    <div>

                        <p>
                            Approved Requests
                        </p>

                        <h2>
                            {stats.approved_requests ?? 0}
                        </h2>

                    </div>

                    <div className="employee-stat-icon green">

                        <CheckCircle size={21} />

                    </div>

                </div>


                {/* REJECTED */}

                <div className="employee-stat-card">

                    <div>

                        <p>
                            Rejected Requests
                        </p>

                        <h2>
                            {stats.rejected_requests ?? 0}
                        </h2>

                    </div>

                    <div className="employee-stat-icon red">

                        <XCircle size={21} />

                    </div>

                </div>

            </div>


            {/* ================================================= */}
            {/* CONTENT */}
            {/* ================================================= */}

            <div className="employee-content-grid">


                {/* ================================================= */}
                {/* ASSIGNED ASSETS */}
                {/* ================================================= */}

                <div className="employee-panel">

                    <div className="employee-panel-header">

                        <div>

                            <h2>
                                My Assigned Assets
                            </h2>

                            <p>
                                Assets currently assigned to you
                            </p>

                        </div>

                        <Package
                            size={19}
                            className="employee-panel-icon"
                        />

                    </div>


                    {recentAssets.length === 0 ? (

                        <div className="employee-empty-state">

                            <Package size={30} />

                            <p className="employee-empty-title">
                                No assets assigned
                            </p>

                            <p className="employee-empty-description">
                                You currently don't have any assigned assets.
                            </p>

                        </div>

                    ) : (

                        <div className="employee-assets-list">

                            {recentAssets.map((asset) => (

                                <div
                                    key={asset.assignment_id}
                                    className="employee-asset-item"
                                >

                                    <div
                                        className="employee-asset-top"
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            gap: "16px",
                                            width: "100%",
                                            minWidth: 0,
                                            flexWrap: "wrap"
                                        }}
                                    >
                                        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                                            <div
                                                className="employee-asset-title"
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                    gap: "10px",
                                                    minWidth: 0
                                                }}
                                            >
                                                <h3 style={{ margin: 0, overflowWrap: "anywhere" }}>
                                                    {asset.asset_tag}
                                                </h3>

                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flex: "0 0 auto",
                                                        whiteSpace: "nowrap",
                                                        position: "static"
                                                    }}
                                                >
                                                    {asset.asset_type}
                                                </span>
                                            </div>

                                            <p
                                                className="employee-asset-description"
                                                style={{
                                                    marginTop: "8px",
                                                    marginBottom: 0,
                                                    overflowWrap: "anywhere"
                                                }}
                                            >
                                                {[
                                                    asset.brand,
                                                    asset.model
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ") ||
                                                    "Asset details unavailable"}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="employee-asset-meta"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            gap: "10px",
                                            marginTop: "18px",
                                            width: "100%",
                                            minWidth: 0
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                flexWrap: "wrap",
                                                gap: "7px",
                                                minWidth: 0,
                                                lineHeight: 1.5
                                            }}
                                        >
                                            <CalendarDays size={15} style={{ flexShrink: 0 }} />
                                            <span>
                                                Issued: {formatDate(asset.issue_date)}
                                            </span>
                                        </span>

                                        {asset.expected_return_date && (
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                    gap: "7px",
                                                    minWidth: 0,
                                                    lineHeight: 1.5
                                                }}
                                            >
                                                <CalendarDays size={15} style={{ flexShrink: 0 }} />
                                                <span>
                                                    Expected return: {formatDate(asset.expected_return_date)}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>


                {/* ================================================= */}
                {/* REQUESTS */}
                {/* ================================================= */}

                <div className="employee-panel">

                    <div className="employee-panel-header">

                        <div>

                            <h2>
                                Recent Asset Requests
                            </h2>

                            <p>
                                Your latest asset requests
                            </p>

                        </div>

                        <Clock
                            size={19}
                            className="employee-panel-icon"
                        />

                    </div>


                    {recentRequests.length === 0 ? (

                        <div className="employee-empty-state">

                            <Clock size={30} />

                            <p className="employee-empty-title">
                                No requests yet
                            </p>

                            <p className="employee-empty-description">
                                Your asset requests will appear here.
                            </p>

                        </div>

                    ) : (

                        <div className="employee-requests-list">

                            {recentRequests.map((request) => (

                                <div
                                    key={request.id}
                                    className="employee-request-item"
                                >

                                    <div className="employee-request-top">

                                        <div>

                                            <h3>
                                                {request.asset_tag || "Asset"}
                                            </h3>

                                            <p>
                                                {request.asset_type ||
                                                    "Asset type unavailable"}
                                            </p>

                                        </div>

                                        <div>
                                            {requestStatus(
                                                request.status
                                            )}
                                        </div>

                                    </div>


                                    <div className="employee-request-date">

                                        <CalendarDays
                                            size={13}
                                        />

                                        {formatDate(
                                            request.request_date
                                        )}

                                    </div>


                                    {request.review_remarks && (

                                        <div className="employee-review">

                                            <span>
                                                Review:
                                            </span>

                                            {" "}

                                            {request.review_remarks}

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </div>


            {/* ================================================= */}
            {/* REQUEST SUMMARY */}
            {/* ================================================= */}

            <div className="employee-summary-panel">

                <div className="employee-summary-header">

                    <div>

                        <h2>
                            Request Summary
                        </h2>

                        <p>
                            Overview of your asset request history
                        </p>

                    </div>

                    <Clock
                        size={19}
                        className="employee-panel-icon"
                    />

                </div>


                <div className="employee-summary-grid">


                    <div className="employee-summary-card">

                        <p>
                            Total
                        </p>

                        <strong>
                            {stats.total_requests ?? 0}
                        </strong>

                    </div>


                    <div className="employee-summary-card pending">

                        <p>
                            Pending
                        </p>

                        <strong>
                            {stats.pending_requests ?? 0}
                        </strong>

                    </div>


                    <div className="employee-summary-card approved">

                        <p>
                            Approved
                        </p>

                        <strong>
                            {stats.approved_requests ?? 0}
                        </strong>

                    </div>


                    <div className="employee-summary-card rejected">

                        <p>
                            Rejected
                        </p>

                        <strong>
                            {stats.rejected_requests ?? 0}
                        </strong>

                    </div>

                </div>

            </div>

        </div>

    );
}


export default EmployeeDashboard;