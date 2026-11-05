import { useEffect, useState } from "react";

import {
    ClipboardList,
    CheckCircle,
    Clock,
    XCircle,
    Package,
    User,
    CalendarDays,
    RefreshCw,
    X
} from "lucide-react";

import api from "../services/api"; 


function AssetRequests() {

    const [requests, setRequests] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [filter, setFilter] =
        useState("PENDING");

    const [selectedRequest, setSelectedRequest] =
        useState(null);

    const [showAssignModal, setShowAssignModal] =
        useState(false);

    const [showRejectModal, setShowRejectModal] =
        useState(false);

    const [rejectRequest, setRejectRequest] =
        useState(null);

    const [rejectReason, setRejectReason] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);


    const [form, setForm] = useState({
        expected_return_date: "",
        condition_at_issue: "GOOD",
        remarks: ""
    });


    // ============================================================
    // LOAD REQUESTS
    // ============================================================

    const loadRequests = async () => {

        try {

            setLoading(true);

            const response =
                await api.get(
                    `/asset-requests/review?status=${filter}`
                );

            setRequests(
                response.data.requests || []
            );

        } catch (error) {

            console.error(
                "Failed to load asset requests:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to load asset requests."
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadRequests();
    }, [filter]);


    // ============================================================
    // OPEN ASSIGN MODAL
    // ============================================================

    const openAssignModal = (request) => {

        setSelectedRequest(request);

        setForm({
            expected_return_date: "",
            condition_at_issue: "GOOD",
            remarks: ""
        });

        setShowAssignModal(true);
    };


    // ============================================================
    // APPROVE REQUEST
    // ============================================================

    const handleAssign = async (event) => {

        event.preventDefault();

        if (!selectedRequest) {
            return;
        }

        try {

            setSubmitting(true);

            await api.post(
                `/asset-requests/${selectedRequest.id}/approve`,
                form
            );

            setShowAssignModal(false);
            setSelectedRequest(null);

            await loadRequests();

            alert(
                "Asset assigned successfully."
            );

        } catch (error) {

            console.error(
                "Assignment error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to assign asset."
            );

        } finally {

            setSubmitting(false);
        }
    };


    // ============================================================
    // OPEN REJECT MODAL
    // ============================================================

    const openRejectModal = (request) => {
        setRejectRequest(request);
        setRejectReason("");
        setShowRejectModal(true);
    };


    // ============================================================
    // REJECT REQUEST
    // ============================================================

    const handleReject = async (event) => {
        event.preventDefault();

        if (!rejectRequest) {
            return;
        }

        const reason = rejectReason.trim();

        if (!reason) {
            return;
        }

        try {
            setSubmitting(true);

            await api.post(
                `/asset-requests/${rejectRequest.id}/reject`,
                {
                    review_remarks: reason
                }
            );

            setShowRejectModal(false);
            setRejectRequest(null);
            setRejectReason("");

            await loadRequests();

            alert("Asset request rejected successfully.");

        } catch (error) {
            console.error(
                "Reject request error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to reject request."
            );

        } finally {
            setSubmitting(false);
        }
    };


    // ============================================================
    // STATUS
    // ============================================================

    const statusBadge = (status) => {

        if (status === "APPROVED") {

            return (
                <span className="request-status approved">
                    <CheckCircle size={14} />
                    Approved
                </span>
            );
        }

        if (status === "REJECTED") {

            return (
                <span className="request-status rejected">
                    <XCircle size={14} />
                    Rejected
                </span>
            );
        }

        return (
            <span className="request-status pending">
                <Clock size={14} />
                Pending
            </span>
        );
    };


    // ============================================================
    // DATE
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        return new Date(
            date
        ).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    };


    return (

        <div className="asset-requests-page">

            {/* HEADER */}

            <div className="page-header">

                <div>

                    <p className="page-label">
                        Asset Management
                    </p>

                    <h1>
                        Asset Requests
                    </h1>

                    <p>
                        Review employee requests and
                        assign available assets.
                    </p>

                </div>

                <button
                    className="refresh-button"
                    onClick={loadRequests}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>

            </div>


            {/* FILTER */}

            <div className="requests-toolbar">

                <button
                    className={
                        filter === "PENDING"
                            ? "request-filter active"
                            : "request-filter"
                    }
                    onClick={() =>
                        setFilter("PENDING")
                    }
                >
                    <Clock size={16} />
                    Pending
                </button>


                <button
                    className={
                        filter === "APPROVED"
                            ? "request-filter active"
                            : "request-filter"
                    }
                    onClick={() =>
                        setFilter("APPROVED")
                    }
                >
                    <CheckCircle size={16} />
                    Approved
                </button>


                <button
                    className={
                        filter === "REJECTED"
                            ? "request-filter active"
                            : "request-filter"
                    }
                    onClick={() =>
                        setFilter("REJECTED")
                    }
                >
                    <XCircle size={16} />
                    Rejected
                </button>

            </div>


            {/* TABLE */}

            <div className="requests-table-container">

                {loading ? (

                    <div className="table-message">

                        <RefreshCw
                            size={20}
                            className="employee-loading-icon"
                        />

                        Loading requests...

                    </div>

                ) : requests.length === 0 ? (

                    <div className="empty-assets">

                        <ClipboardList
                            size={42}
                        />

                        <h3>
                            No requests found
                        </h3>

                        <p>
                            There are no {filter.toLowerCase()}
                            asset requests.
                        </p>

                    </div>

                ) : (

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Asset
                                </th>

                                <th>
                                    Employee
                                </th>

                                <th>
                                    Requested
                                </th>

                                <th>
                                    Remarks
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {requests.map(
                                (request) => (

                                    <tr
                                        key={request.id}
                                    >

                                        <td>
                                            <div className="request-asset-cell">
                                                <Package size={18} />

                                                <div>
                                                    <strong>
                                                        {request.asset_tag
                                                            ? request.asset_tag
                                                            : request.requested_asset}
                                                    </strong>

                                                    <small>
                                                        {request.asset_tag
                                                            ? (
                                                                <>
                                                                    {request.asset_type || request.requested_asset}

                                                                    {request.brand
                                                                        ? ` • ${request.brand}`
                                                                        : ""}

                                                                    {request.model
                                                                        ? ` • ${request.model}`
                                                                        : ""}
                                                                </>
                                                            )
                                                            : "Requested Asset"}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>


                                        <td>

                                            <div className="request-employee-cell">

                                                <User
                                                    size={18}
                                                />

                                                <div>

                                                    <strong>
                                                        Employee
                                                        #{request.employee_id}
                                                    </strong>

                                                </div>

                                            </div>

                                        </td>


                                        <td>

                                            <div className="request-date">

                                                <CalendarDays
                                                    size={14}
                                                />

                                                {formatDate(
                                                    request.request_date
                                                )}

                                            </div>

                                        </td>


                                        <td>

                                            <span className="request-remarks">

                                                {
                                                    request.remarks ||
                                                    "No remarks"
                                                }

                                            </span>

                                        </td>


                                        <td>

                                            {
                                                statusBadge(
                                                    request.status
                                                )
                                            }

                                        </td>


                                        <td>

                                            {request.status ===
                                                "PENDING" && (

                                                    <div className="request-actions">

                                                        <button
                                                            className="assign-request-button"
                                                            onClick={() =>
                                                                openAssignModal(
                                                                    request
                                                                )
                                                            }
                                                        >
                                                            <CheckCircle
                                                                size={15}
                                                            />
                                                            Assign
                                                        </button>


                                                        <button
                                                            className="reject-request-button"
                                                            onClick={() =>
                                                                openRejectModal(request)
                                                            }
                                                        >
                                                            <XCircle size={15} />
                                                            Reject
                                                        </button>

                                                    </div>

                                                )}

                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>

                )}

            </div>


            {/* =======================================================
                ASSIGN MODAL
            ======================================================= */}

            {/* =======================================================
    ASSIGN REQUEST MODAL
======================================================= */}

            {showAssignModal && selectedRequest && (
                <div
                    className="request-modal-overlay"
                    onClick={() => {
                        if (!submitting) {
                            setShowAssignModal(false);
                        }
                    }}
                >
                    <div
                        className="request-modal"
                        onClick={(event) => event.stopPropagation()}
                    >

                        {/* ================= MODAL HEADER ================= */}

                        <div className="request-modal-header">

                            <div className="request-modal-title">

                                <div className="request-modal-icon">
                                    <CheckCircle size={22} />
                                </div>

                                <div>
                                    <h2>Assign Requested Asset</h2>

                                    <p>
                                        Review the request before assigning
                                        the asset to the employee.
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="request-modal-close"
                                onClick={() => {
                                    if (!submitting) {
                                        setShowAssignModal(false);
                                    }
                                }}
                                disabled={submitting}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>

                        </div>


                        {/* ================= MODAL BODY ================= */}

                        <form
                            className="request-modal-form"
                            onSubmit={handleAssign}
                        >

                            <div className="request-modal-body">

                                {/* ================= LOCKED DETAILS ================= */}

                                <div className="request-details-grid">

                                    {/* ASSET */}

                                    <div className="request-detail-card">

                                        <div className="request-detail-label">
                                            <Package size={16} />
                                            <span>ASSET</span>
                                        </div>

                                        <div className="request-detail-main">
                                            <strong>
                                                {selectedRequest.asset_tag}
                                            </strong>
                                        </div>

                                        <div className="request-detail-sub">
                                            {selectedRequest.asset_type}

                                            {selectedRequest.brand
                                                ? ` • ${selectedRequest.brand}`
                                                : ""}

                                            {selectedRequest.model
                                                ? ` • ${selectedRequest.model}`
                                                : ""}
                                        </div>

                                    </div>


                                    {/* EMPLOYEE */}

                                    <div className="request-detail-card">

                                        <div className="request-detail-label">
                                            <User size={16} />
                                            <span>EMPLOYEE</span>
                                        </div>

                                        <div className="request-detail-main">
                                            <strong>
                                                {selectedRequest.employee_name ||
                                                    "Unknown Employee"}
                                            </strong>
                                        </div>

                                        <div className="request-detail-sub">

                                            {selectedRequest.employee_code || ""}

                                            {selectedRequest.employee_email
                                                ? ` • ${selectedRequest.employee_email}`
                                                : ""}

                                        </div>

                                    </div>

                                </div>


                                {/* ================= FORM ================= */}

                                <div className="request-form-grid">

                                    {/* EXPECTED RETURN DATE */}

                                    <div className="request-form-field">

                                        <label>
                                            Expected Return Date
                                        </label>

                                        <div className="request-input-wrapper">

                                            <CalendarDays
                                                size={17}
                                                className="request-input-icon"
                                            />

                                            <input
                                                type="date"
                                                value={
                                                    form.expected_return_date
                                                }
                                                onChange={(event) =>
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        expected_return_date:
                                                            event.target.value
                                                    }))
                                                }
                                            />

                                        </div>

                                    </div>


                                    {/* CONDITION */}

                                    <div className="request-form-field">

                                        <label>
                                            Condition at Issue
                                        </label>

                                        <select
                                            value={
                                                form.condition_at_issue
                                            }
                                            onChange={(event) =>
                                                setForm((previous) => ({
                                                    ...previous,
                                                    condition_at_issue:
                                                        event.target.value
                                                }))
                                            }
                                        >

                                            <option value="NEW">
                                                New
                                            </option>

                                            <option value="GOOD">
                                                Good
                                            </option>

                                            <option value="FAIR">
                                                Fair
                                            </option>

                                        </select>

                                    </div>

                                </div>


                                {/* ================= REMARKS ================= */}

                                <div className="request-form-field">

                                    <label>
                                        Assignment Remarks
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={form.remarks}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                remarks:
                                                    event.target.value
                                            }))
                                        }
                                        placeholder="Optional assignment remarks..."
                                    />

                                </div>

                            </div>


                            {/* ================= FOOTER ================= */}

                            <div className="request-modal-footer">

                                <button
                                    type="button"
                                    className="request-cancel-button"
                                    onClick={() => {
                                        if (!submitting) {
                                            setShowAssignModal(false);
                                        }
                                    }}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="request-confirm-button"
                                    disabled={submitting}
                                >

                                    <CheckCircle size={17} />

                                    {submitting
                                        ? "Assigning..."
                                        : "Confirm Assignment"}

                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            )}

            {/* ============================================================
    REJECT REQUEST MODAL
============================================================ */}

            {showRejectModal && rejectRequest && (
                <div
                    className="request-modal-overlay"
                    onClick={() => {
                        if (!submitting) {
                            setShowRejectModal(false);
                            setRejectRequest(null);
                            setRejectReason("");
                        }
                    }}
                >
                    <div
                        className="reject-request-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="reject-modal-header">

                            <div className="reject-modal-title">

                                <div className="reject-modal-icon">
                                    <XCircle size={22} />
                                </div>

                                <div>
                                    <h2>Reject Asset Request</h2>

                                    <p>
                                        Provide a reason for rejecting
                                        this employee request.
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="request-modal-close"
                                onClick={() => {
                                    if (!submitting) {
                                        setShowRejectModal(false);
                                        setRejectRequest(null);
                                        setRejectReason("");
                                    }
                                }}
                                disabled={submitting}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>

                        </div>


                        {/* BODY */}

                        <form
                            className="reject-modal-form"
                            onSubmit={handleReject}
                        >

                            <div className="reject-modal-body">

                                {/* REQUEST INFORMATION */}

                                <div className="reject-request-summary">

                                    <div className="reject-summary-item">

                                        <span className="reject-summary-label">
                                            Requested Asset
                                        </span>

                                        <strong>
                                            {rejectRequest.requested_asset ||
                                                rejectRequest.asset_type ||
                                                "Asset"}
                                        </strong>

                                    </div>


                                    <div className="reject-summary-item">

                                        <span className="reject-summary-label">
                                            Employee
                                        </span>

                                        <strong>
                                            {rejectRequest.employee_name ||
                                                `Employee #${rejectRequest.employee_id}`}
                                        </strong>

                                    </div>

                                </div>


                                {/* REASON */}

                                <div className="reject-form-field">

                                    <label htmlFor="reject-reason">
                                        Rejection Reason
                                        <span className="required">
                                            *
                                        </span>
                                    </label>

                                    <textarea
                                        id="reject-reason"
                                        value={rejectReason}
                                        onChange={(event) =>
                                            setRejectReason(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Enter the reason for rejecting this request..."
                                        rows={5}
                                        disabled={submitting}
                                        autoFocus
                                    />

                                </div>

                            </div>


                            {/* FOOTER */}

                            <div className="reject-modal-footer">

                                <button
                                    type="button"
                                    className="request-cancel-button"
                                    onClick={() => {
                                        if (!submitting) {
                                            setShowRejectModal(false);
                                            setRejectRequest(null);
                                            setRejectReason("");
                                        }
                                    }}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="reject-confirm-button"
                                    disabled={
                                        submitting ||
                                        !rejectReason.trim()
                                    }
                                >
                                    <XCircle size={17} />

                                    {submitting
                                        ? "Rejecting..."
                                        : "Reject Request"}
                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}


export default AssetRequests;