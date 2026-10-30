import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    RotateCcw,
    Package,
    UserCheck,
    Download
} from "lucide-react";

import * as XLSX from "xlsx";

import api from "../services/api";

function Assignments() {

    const [assignments, setAssignments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);

    const [selectedAssignment, setSelectedAssignment] = useState(null);

    const [form, setForm] = useState({
        asset_id: "",
        employee_id: "",
        issue_date: new Date().toISOString().split("T")[0],
        expected_return_date: "",
        issued_by: "",
        condition_at_issue: "GOOD",
        remarks: ""
    });

    const [errorModal, setErrorModal] = useState({
        open: false,
        message: ""
    });

    const [returnForm, setReturnForm] = useState({
        actual_return_date:
            new Date().toISOString().split("T")[0],
        returned_to: "",
        condition_at_return: "GOOD",
        remarks: ""
    });


    const fetchData = async () => {

        try {

            setLoading(true);

            const [
                assignmentsResponse,
                assetsResponse,
                employeesResponse
            ] = await Promise.all([
                api.get("/assignments"),
                api.get("/assets"),
                api.get("/employees")
            ]);

            setAssignments(
                assignmentsResponse.data
            );

            setAssets(
                assetsResponse.data
            );

            setEmployees(
                employeesResponse.data
            );

        } catch (error) {

            console.error(
                "Assignment data error:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        fetchData();
    }, []);


    const handleFormChange = (event) => {

        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };


    const handleReturnChange = (event) => {

        const { name, value } = event.target;

        setReturnForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };


    const openAssignModal = () => {

        setForm({
            asset_id: "",
            employee_id: "",
            issue_date:
                new Date().toISOString().split("T")[0],
            expected_return_date: "",
            issued_by: "",
            condition_at_issue: "GOOD",
            remarks: ""
        });

        setShowAssignModal(true);
    };


    const handleAssign = async (event) => {

        event.preventDefault();

        if (
            form.expected_return_date &&
            form.expected_return_date < form.issue_date
        ) {
            setErrorModal({
                open: true,
                message:
                    "Expected return date cannot be before the issue date."
            });
            return;
        }

        try {

            await api.post(
                "/assignments",
                form
            );

            setShowAssignModal(false);

            await fetchData();

        } catch (error) {

            console.error(
                "Assignment error:",
                error
            );

            setErrorModal({
                open: true,
                message:
                    error.response?.data?.message ||
                    "Unable to assign asset."
            });
        }
    };


    const openReturnModal = (assignment) => {

        setSelectedAssignment(assignment);

        const today =
            new Date().toISOString().split("T")[0];

        const issueDate =
            assignment.issue_date;

        const defaultReturnDate =
            today < issueDate
                ? issueDate
                : today;

        setReturnForm({
            actual_return_date: defaultReturnDate,
            returned_to: "",
            condition_at_return: "GOOD",
            remarks: ""
        });

        setShowReturnModal(true);
    };


    const handleReturn = async (event) => {

        event.preventDefault();

        if (!selectedAssignment) {
            return;
        }

        if (
            returnForm.actual_return_date <
            selectedAssignment.issue_date
        ) {
            setErrorModal({
                open: true,
                message:
                    "Actual return date cannot be before the issue date."
            });
            return;
        }

        try {

            await api.post(
                `/assignments/${selectedAssignment.id}/return`,
                returnForm
            );

            setShowReturnModal(false);
            setSelectedAssignment(null);

            await fetchData();

        } catch (error) {

            console.error(
                "Return error:",
                error
            );

            setErrorModal({
                open: true,
                message:
                    error.response?.data?.message ||
                    "Unable to return asset."
            });
        }
    };


    const filteredAssignments =
        assignments.filter((assignment) => {

            const matchesSearch =
                !search ||
                assignment.asset_tag
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                assignment.employee_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                assignment.employee_code
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            const matchesFilter =
                filter === "ALL" ||
                assignment.status === filter;

            return (
                matchesSearch &&
                matchesFilter
            );
        });


    const availableAssets =
        assets.filter(
            (asset) =>
                asset.status === "AVAILABLE"
        );


    const activeEmployees =
        employees.filter(
            (employee) =>
                employee.status === "ACTIVE"
        );


    const handleDownloadExcel = () => {

        if (!assignments || assignments.length === 0) {
            alert("No assignment records available to download.");
            return;
        }

        const excelData = assignments.map((assignment) => ({
            "Asset": assignment.asset_tag || "",
            "Asset Type": assignment.asset_type || "",
            "Employee ID": assignment.employee_code || "",
            "Employee Name": assignment.employee_name || "",
            "Issue Date": assignment.issue_date || "",
            "Expected Return Date":
                assignment.expected_return_date || "",
            "Actual Return Date":
                assignment.actual_return_date || "",
            "Condition":
                assignment.condition_at_return ||
                assignment.condition_at_issue ||
                "",
            "Status": assignment.status || ""
        }));

        const worksheet =
            XLSX.utils.json_to_sheet(excelData);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Assignments"
        );

        XLSX.writeFile(
            workbook,
            "Asset_Assignments.xlsx"
        );
    };


    return (
        <div className="assignments-page">

            <div className="page-header">

                <div>
                    <h1>Asset Assignments</h1>

                    <p>
                        Manage asset issue and return records
                    </p>
                </div>

                <div className="page-header-actions">

                    <button
                        className="download-excel-button"
                        onClick={handleDownloadExcel}
                        type="button"
                    >
                        <Download size={18} />
                        Download Excel
                    </button>

                    <button
                        className="add-button"
                        onClick={openAssignModal}
                        type="button"
                    >
                        <Plus size={18} />
                        Assign Asset
                    </button>

                </div>

            </div>


            <div className="assignments-toolbar">

                <div className="search-box">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search asset or employee..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                </div>


                <select
                    value={filter}
                    onChange={(event) =>
                        setFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="ALL">
                        All
                    </option>

                    <option value="ACTIVE">
                        Active
                    </option>

                    <option value="RETURNED">
                        Returned
                    </option>

                </select>

            </div>


            <div className="assignments-table-container">

                {loading ? (

                    <div className="table-message">
                        Loading assignments...
                    </div>

                ) : filteredAssignments.length === 0 ? (

                    <div className="empty-state">

                        <div className="empty-state-icon">
                            <UserCheck size={42} />
                        </div>

                        <h3>No assignments found</h3>

                        <p>
                            Assign an available asset to an employee to get started.
                        </p>

                    </div>

                ) : (

                    <>
                        {/* ================================
                DESKTOP TABLE
            ================================= */}

                        <div className="assignments-desktop-table">

                            <table>

                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Employee</th>
                                        <th>Issue Date</th>
                                        <th>Expected Return</th>
                                        <th>Actual Return</th>
                                        <th>Condition</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredAssignments.map(
                                        (assignment) => (

                                            <tr key={assignment.id}>

                                                <td>
                                                    <strong>
                                                        {assignment.asset_tag}
                                                    </strong>

                                                    <small>
                                                        {assignment.asset_type}
                                                    </small>
                                                </td>

                                                <td>
                                                    <strong>
                                                        {assignment.employee_name}
                                                    </strong>

                                                    <small>
                                                        {assignment.employee_code}
                                                    </small>
                                                </td>

                                                <td>
                                                    {assignment.issue_date}
                                                </td>

                                                <td>
                                                    {assignment.expected_return_date || "-"}
                                                </td>

                                                <td>
                                                    {assignment.actual_return_date || "-"}
                                                </td>

                                                <td>
                                                    {
                                                        assignment.condition_at_return ||
                                                        assignment.condition_at_issue ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>

                                                    <span
                                                        className={`status-badge status-${assignment.status.toLowerCase()}`}
                                                    >
                                                        {assignment.status}
                                                    </span>

                                                </td>

                                                <td>

                                                    {assignment.status === "ACTIVE" && (

                                                        <button
                                                            className="return-button"
                                                            onClick={() =>
                                                                openReturnModal(
                                                                    assignment
                                                                )
                                                            }
                                                        >
                                                            <RotateCcw size={16} />
                                                            Return
                                                        </button>

                                                    )}

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>


                        {/* ================================
                MOBILE CARDS
            ================================= */}

                        <div className="assignments-mobile-cards">

                            {filteredAssignments.map(
                                (assignment) => (

                                    <div
                                        className="assignment-card"
                                        key={assignment.id}
                                    >

                                        {/* CARD HEADER */}

                                        <div className="assignment-card-header">

                                            <div>

                                                <strong>
                                                    {assignment.asset_tag}
                                                </strong>

                                                <span>
                                                    {assignment.asset_type}
                                                </span>

                                            </div>

                                            <span
                                                className={`status-badge status-${assignment.status.toLowerCase()}`}
                                            >
                                                {assignment.status}
                                            </span>

                                        </div>


                                        {/* EMPLOYEE */}

                                        <div className="assignment-card-employee">

                                            <span>Employee</span>

                                            <div>
                                                <strong>
                                                    {assignment.employee_name}
                                                </strong>

                                                <small>
                                                    {assignment.employee_code}
                                                </small>
                                            </div>

                                        </div>


                                        {/* DETAILS */}

                                        <div className="assignment-card-details">

                                            <div>
                                                <span>Issue Date</span>
                                                <strong>
                                                    {assignment.issue_date || "-"}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Expected Return</span>
                                                <strong>
                                                    {
                                                        assignment.expected_return_date ||
                                                        "-"
                                                    }
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Actual Return</span>
                                                <strong>
                                                    {
                                                        assignment.actual_return_date ||
                                                        "-"
                                                    }
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Condition</span>
                                                <strong>
                                                    {
                                                        assignment.condition_at_return ||
                                                        assignment.condition_at_issue ||
                                                        "-"
                                                    }
                                                </strong>
                                            </div>

                                        </div>


                                        {/* ACTION */}

                                        {assignment.status === "ACTIVE" && (

                                            <button
                                                className="return-button assignment-mobile-return"
                                                onClick={() =>
                                                    openReturnModal(
                                                        assignment
                                                    )
                                                }
                                            >
                                                <RotateCcw size={17} />
                                                Return Asset
                                            </button>

                                        )}

                                    </div>

                                )
                            )}

                        </div>

                    </>

                )}

            </div>

            {showAssignModal && (

                <div className="modal-overlay">

                    <div className="asset-modal">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    Assign Asset
                                </h2>

                                <p>
                                    Issue an available asset
                                    to an employee
                                </p>

                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowAssignModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleAssign}
                        >

                            <div className="form-grid">

                                <div className="form-field">

                                    <label>
                                        Asset *
                                    </label>

                                    <select
                                        name="asset_id"
                                        value={form.asset_id}
                                        onChange={handleFormChange}
                                        required
                                    >

                                        <option value="">
                                            Select asset
                                        </option>

                                        {availableAssets.map(
                                            (asset) => (

                                                <option
                                                    key={asset.id}
                                                    value={asset.id}
                                                >
                                                    {
                                                        asset.asset_tag
                                                    }
                                                    {" - "}
                                                    {
                                                        asset.asset_type
                                                    }
                                                    {" "}
                                                    {
                                                        asset.brand
                                                    }
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                <div className="form-field">

                                    <label>
                                        Employee *
                                    </label>

                                    <select
                                        name="employee_id"
                                        value={form.employee_id}
                                        onChange={handleFormChange}
                                        required
                                    >

                                        <option value="">
                                            Select employee
                                        </option>

                                        {activeEmployees.map(
                                            (employee) => (

                                                <option
                                                    key={employee.id}
                                                    value={employee.id}
                                                >
                                                    {
                                                        employee.employee_id
                                                    }
                                                    {" - "}
                                                    {
                                                        employee.name
                                                    }
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                <FormInput
                                    label="Issue Date *"
                                    type="date"
                                    name="issue_date"
                                    value={form.issue_date}
                                    onChange={handleFormChange}
                                    required
                                />


                                <FormInput
                                    label="Expected Return Date *"
                                    type="date"
                                    name="expected_return_date"
                                    value={form.expected_return_date}
                                    min={form.issue_date}
                                    onChange={handleFormChange}
                                    required

                                />


                                <FormInput
                                    label="Issued By"
                                    name="issued_by"
                                    value={form.issued_by}
                                    onChange={handleFormChange}
                                    placeholder="IT Head"
                                />


                                <div className="form-field">

                                    <label>
                                        Condition at Issue
                                    </label>

                                    <select
                                        name="condition_at_issue"
                                        value={
                                            form.condition_at_issue
                                        }
                                        onChange={handleFormChange}
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

                                        <option value="DAMAGED">
                                            Damaged
                                        </option>

                                    </select>

                                </div>

                            </div>


                            <div className="form-field full-width">

                                <label>
                                    Remarks
                                </label>

                                <textarea
                                    name="remarks"
                                    value={form.remarks}
                                    onChange={handleFormChange}
                                    rows="3"
                                />

                            </div>


                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setShowAssignModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="add-button"
                                >
                                    <UserCheck size={17} />
                                    Assign Asset
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {showReturnModal && selectedAssignment && (

                <div className="modal-overlay">

                    <div className="asset-modal">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    Return Asset
                                </h2>

                                <p>
                                    {
                                        selectedAssignment.asset_tag
                                    }
                                    {" assigned to "}
                                    {
                                        selectedAssignment.employee_name
                                    }
                                </p>

                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowReturnModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleReturn}
                        >

                            <div className="form-grid">

                                <FormInput
                                    label="Return Date *"
                                    type="date"
                                    name="actual_return_date"
                                    min={selectedAssignment.issue_date}
                                    value={returnForm.actual_return_date}
                                    onChange={handleReturnChange}
                                />


                                <FormInput
                                    label="Returned To"
                                    name="returned_to"
                                    value={
                                        returnForm.returned_to
                                    }
                                    onChange={handleReturnChange}
                                    placeholder="IT Head"
                                />


                                <div className="form-field">

                                    <label>
                                        Condition at Return
                                    </label>

                                    <select
                                        name="condition_at_return"
                                        value={
                                            returnForm.condition_at_return
                                        }
                                        onChange={
                                            handleReturnChange
                                        }
                                    >
                                        <option value="GOOD">
                                            Good
                                        </option>

                                        <option value="FAIR">
                                            Fair
                                        </option>

                                        <option value="DAMAGED">
                                            Damaged
                                        </option>

                                    </select>

                                </div>

                            </div>


                            <div className="form-field full-width">

                                <label>
                                    Remarks
                                </label>

                                <textarea
                                    name="remarks"
                                    value={
                                        returnForm.remarks
                                    }
                                    onChange={
                                        handleReturnChange
                                    }
                                    rows="3"
                                />

                            </div>


                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setShowReturnModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="add-button"
                                >
                                    <RotateCcw size={17} />
                                    Confirm Return
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {errorModal.open && (
                <div className="modal-overlay">
                    <div className="error-modal">

                        <div className="error-modal-icon">
                            !
                        </div>

                        <h2>Invalid Date</h2>

                        <p>
                            {errorModal.message}
                        </p>

                        <button
                            className="error-modal-button"
                            onClick={() =>
                                setErrorModal({
                                    open: false,
                                    message: ""
                                })
                            }
                        >
                            OK
                        </button>

                    </div>
                </div>
            )}

        </div>
    );
}


function FormInput({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder,
    required
}) {

    return (
        <div className="form-field">

            <label>
                {label}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
            />

        </div>
    );
}


export default Assignments;