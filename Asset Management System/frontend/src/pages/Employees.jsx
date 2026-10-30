import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Users,
    X,
    Pencil,
    Trash2,
    Download
} from "lucide-react";

import * as XLSX from "xlsx";

import { AssetDetailsModal } from "./Assets";

import api from "../services/api";


function Employees() {

    const [employees, setEmployees] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [showModal, setShowModal] =
        useState(false);

    const [showEditModal, setShowEditModal] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [selectedEmployee, setSelectedEmployee] =
        useState(null);

    const [showEmployeeDetails, setShowEmployeeDetails] =
        useState(false);

    const [employeeAssignments, setEmployeeAssignments] =
        useState([]);

    const [selectedAsset, setSelectedAsset] =
        useState(null);

    const [loading, setLoading] =
        useState(true);


    const loadEmployees = async () => {

        try {

            setLoading(true);

            const response =
                await api.get(
                    "/employees",
                    {
                        params: {
                            search:
                                search || undefined
                        }
                    }
                );

            setEmployees(
                response.data
            );

        } catch (error) {

            console.error(
                "Failed to load employees:",
                error
            );

        } finally {

            setLoading(false);
        }
    };

    const handleEdit = (employee) => {

        setSelectedEmployee(employee);

        setShowEditModal(true);
    };

    const handleEmployeeClick = async (employee) => {
        try {
            const response = await api.get("/assignments");

            const assignments = response.data || [];

            const activeAssignments = assignments.filter(
                (assignment) =>
                    Number(assignment.employee_id) === Number(employee.id) &&
                    !assignment.actual_return_date
            );

            setSelectedEmployee(employee);
            setEmployeeAssignments(activeAssignments);
            setShowEmployeeDetails(true);

        } catch (error) {
            console.error(
                "Failed to load employee assignments:",
                error
            );

            setSelectedEmployee(employee);
            setEmployeeAssignments([]);
            setShowEmployeeDetails(true);
        }
    };

    const handleDelete = (employee) => {

        // Employee cannot be deleted while holding assets
        if (Number(employee.assigned_asset_count) > 0) {
            return;
        }

        setSelectedEmployee(employee);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedEmployee) return;

        try {
            await api.delete(
                `/employees/${selectedEmployee.id}`
            );

            setShowDeleteModal(false);
            setSelectedEmployee(null);

            await loadEmployees();

        } catch (error) {
            console.error(
                "Failed to delete employee:",
                error
            );

            const message =
                error.response?.data?.message ||
                "Failed to delete employee";

            setShowDeleteModal(false);
            setSelectedEmployee(null);

            alert(message);
        }
    };

    const handleDownloadEmployees = () => {
        if (!employees || employees.length === 0) {
            alert("No employees available to download.");
            return;
        }

        const employeeData = employees.map((employee) => ({
            "Employee ID": employee.employee_id || "",
            "Name": employee.name || "",
            "Email": employee.email || "",
            "Phone Number": employee.phone || "",
            "Department": employee.department || "",
            "Designation": employee.designation || "",
            "Cost Center": employee.cost_center || "",
            "Joining Date": employee.joining_date
                ? new Date(employee.joining_date).toLocaleDateString("en-IN")
                : "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(
            employeeData
        );

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Employees"
        );

        // Set column widths
        worksheet["!cols"] = [
            { wch: 18 }, // Employee ID
            { wch: 25 }, // Name
            { wch: 32 }, // Email
            { wch: 18 }, // Phone
            { wch: 22 }, // Department
            { wch: 25 }, // Designation
            { wch: 18 }, // Cost Center
            { wch: 18 }, // Joining Date
        ];

        XLSX.writeFile(
            workbook,
            "Employees.xlsx"
        );
    };


    useEffect(() => {

        const timer = setTimeout(
            loadEmployees,
            300
        );

        return () =>
            clearTimeout(timer);

    }, [search]);


    return (
        <div className="employees-page">

            <div className="page-header">

                <div>
                    <h1>Employees</h1>

                    <p>
                        Manage employees and
                        their assigned IT assets
                    </p>
                </div>

                <div className="employee-header-actions">

                    <button
                        className="download-button"
                        onClick={handleDownloadEmployees}
                    >
                        <Download size={17} />
                        Download Excel
                    </button>

                    <button
                        className="add-button"
                        onClick={() =>
                            setShowModal(true)
                        }
                    >
                        <Plus size={17} />
                        Add Employee
                    </button>

                </div>

            </div>


            <div className="employee-toolbar">

                <div className="asset-search">

                    <Search size={17} />

                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>

            </div>


            <div className="employees-table-container">

                {loading ? (

                    <div className="empty-state">
                        Loading employees...
                    </div>

                ) : employees.length === 0 ? (

                    <div className="empty-state">

                        <Users size={40} />

                        <h3>
                            No employees found
                        </h3>

                        <p>
                            Add your first
                            employee to get started.
                        </p>

                    </div>

                ) : (

                    <table className="assets-table">

                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Employee ID</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Cost Center</th>
                                <th>Assigned Assets</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {employees.map(
                                (employee) => (

                                    <tr
                                        key={employee.id}
                                        onClick={() => handleEmployeeClick(employee)}
                                        className="employee-row-clickable"
                                    >

                                        <td>
                                            <div className="asset-name">

                                                <div className="employee-avatar">
                                                    {
                                                        employee.name
                                                            .charAt(0)
                                                            .toUpperCase()
                                                    }
                                                </div>

                                                <div>
                                                    <strong>
                                                        {
                                                            employee.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            employee.email
                                                        }
                                                    </span>
                                                </div>

                                            </div>
                                        </td>

                                        <td>
                                            {
                                                employee.employee_id
                                            }
                                        </td>

                                        <td>
                                            {
                                                employee.department
                                                || "—"
                                            }
                                        </td>

                                        <td>
                                            {
                                                employee.designation
                                                || "—"
                                            }
                                        </td>

                                        <td>
                                            {
                                                employee.cost_center
                                                || "—"
                                            }
                                        </td>

                                        <td>
                                            {
                                                employee.assigned_asset_count
                                            }
                                        </td>

                                        <td>
                                            <div className="employee-actions">

                                                <button
                                                    className="icon-button edit"
                                                    title="Edit employee"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(employee);
                                                    }}
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    className="icon-button delete"
                                                    title={
                                                        Number(employee.assigned_asset_count) > 0
                                                            ? "Cannot delete employee with assigned assets"
                                                            : "Delete employee"
                                                    }
                                                    disabled={
                                                        Number(employee.assigned_asset_count) > 0
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        if (Number(employee.assigned_asset_count) > 0) {
                                                            return;
                                                        }

                                                        handleDelete(employee);
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                            </div>
                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>
                )}

            </div>


            {showModal && (

                <AddEmployeeModal
                    onClose={() =>
                        setShowModal(false)
                    }
                    onCreated={() => {
                        setShowModal(false);
                        loadEmployees();
                    }}
                />

            )}

            {showEditModal && selectedEmployee && (

                <EditEmployeeModal

                    employee={selectedEmployee}

                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEmployee(null);
                    }}

                    onUpdated={() => {
                        setShowEditModal(false);
                        setSelectedEmployee(null);
                        loadEmployees();
                    }}
                />
            )}

            {showDeleteModal && selectedEmployee && (
                <DeleteEmployeeModal
                    employee={selectedEmployee}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setSelectedEmployee(null);
                    }}
                    onConfirm={confirmDelete}
                />
            )}

            {showEmployeeDetails && selectedEmployee && (
                <EmployeeDetailsModal
                    employee={selectedEmployee}
                    assignments={employeeAssignments}
                    onClose={() => {
                        setShowEmployeeDetails(false);
                        setSelectedEmployee(null);
                        setEmployeeAssignments([]);
                    }}
                    onAssetClick={async (assignment) => {
                        try {
                            const response = await api.get(
                                `/assets/${assignment.asset_id}`
                            );

                            setSelectedAsset({
                                ...response.data,
                                employee: selectedEmployee
                            });

                        } catch (error) {
                            console.error(
                                "Failed to load asset details:",
                                error
                            );
                        }
                    }}
                />
            )}

            {selectedAsset && (
                <AssetDetailsModal
                    asset={selectedAsset}
                    employee={selectedEmployee}
                    onClose={() => setSelectedAsset(null)}
                />
            )}

        </div>
    );
}


function EmployeeDetailsModal({
    employee,
    assignments,
    onClose,
    onAssetClick
}) {
    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-GB");
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
        >
            <div
                className="employee-details-modal"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="modal-header">
                    <div>
                        <h2>
                            {employee.name}
                        </h2>

                        <p>
                            Employee ID:{" "}
                            <strong>
                                {employee.employee_id}
                            </strong>
                        </p>
                    </div>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>


                <div className="employee-details-summary">

                    <div>
                        <span>
                            Total Assigned Assets
                        </span>

                        <strong>
                            {assignments.length}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Cost Center
                        </span>

                        <strong>
                            {employee.cost_center || "—"}
                        </strong>
                    </div>

                </div>


                <div className="employee-assets-section">

                    <h3>
                        Assigned Assets
                    </h3>

                    {assignments.length === 0 ? (

                        <div className="no-assets-assigned">
                            No assets assigned
                        </div>

                    ) : (

                        <div className="employee-assets-table-wrapper">

                            <table className="employee-assets-table">

                                <thead>
                                    <tr>
                                        <th>Asset Tag</th>
                                        <th>Asset Type</th>
                                        <th>Issue Date</th>
                                        <th>Expected Return</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {assignments.map(
                                        (assignment) => (

                                            <tr
                                                key={assignment.id}
                                                onClick={() =>
                                                    onAssetClick(
                                                        assignment
                                                    )
                                                }
                                                className="employee-asset-row"
                                            >

                                                <td>
                                                    <strong>
                                                        {
                                                            assignment.asset_tag ||
                                                            assignment.asset?.asset_tag ||
                                                            "—"
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        assignment.asset_type ||
                                                        assignment.asset?.asset_type ||
                                                        "—"
                                                    }
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        assignment.issue_date ||
                                                        assignment.assigned_date
                                                    )}
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        assignment.expected_return_date
                                                    )}
                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>


                <div className="modal-footer">

                    <button
                        type="button"
                        className="cancel-button"
                        onClick={onClose}
                    >
                        Close
                    </button>

                </div>

            </div>
        </div>
    );
}


function AddEmployeeModal({
    onClose,
    onCreated
}) {

    const [form, setForm] =
        useState({
            employee_id: "",
            name: "",
            email: "",
            phone: "",
            department: "",
            designation: "",
            cost_center: "",
            joining_date: ""
        });

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    const handleChange = (e) => {

        setForm({
            ...form,
            [e.target.name]:
                e.target.value
        });
    };


    const handleSubmit =
        async (e) => {

            e.preventDefault();

            setError("");

            const email = form.email.trim().toLowerCase();

            if (!email.endsWith("@abylle.com")) {
                setError(
                    "Only @abylle.com email addresses are allowed."
                );
                return;
            }

            try {

                setSaving(true);

                await api.post(
                    "/employees",
                    form
                );

                onCreated();

            } catch (error) {

                setError(
                    error.response
                        ?.data?.message
                    ||
                    "Failed to create employee"
                );

            } finally {

                setSaving(false);
            }
        };


    return (

        <div className="modal-overlay">

            <div className="modal">

                <div className="modal-header">

                    <div>
                        <h2>
                            Add Employee
                        </h2>

                        <p>
                            Add an employee to
                            the IT asset system.
                        </p>
                    </div>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}


                <form
                    className="asset-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-grid">

                        <FormField
                            label="Employee ID"
                            name="employee_id"
                            value={
                                form.employee_id
                            }
                            onChange={
                                handleChange
                            }
                            required
                        />

                        <FormField
                            label="Full Name"
                            name="name"
                            value={
                                form.name
                            }
                            onChange={
                                handleChange
                            }
                            required
                        />

                        <FormField
                            label="Email"
                            name="email"
                            type="email"
                            value={
                                form.email
                            }
                            onChange={
                                handleChange
                            }
                            required
                            pattern="[A-Za-z0-9._%+-]+@abylle\.com$"
                            title="Only @abylle.com email addresses are allowed."
                            placeholder="name@abylle.com"
                        />

                        <FormField
                            label="Phone"
                            name="phone"
                            value={
                                form.phone
                            }
                            onChange={
                                handleChange
                            }
                        />

                        <FormField
                            label="Department"
                            name="department"
                            value={
                                form.department
                            }
                            onChange={
                                handleChange
                            }
                        />

                        <FormField
                            label="Designation"
                            name="designation"
                            value={
                                form.designation
                            }
                            onChange={
                                handleChange
                            }
                        />

                        <FormField
                            label="Cost Center"
                            name="cost_center"
                            value={
                                form.cost_center
                            }
                            onChange={
                                handleChange
                            }
                        />

                        <FormField
                            label="Joining Date"
                            name="joining_date"
                            type="date"
                            value={
                                form.joining_date
                            }
                            onChange={
                                handleChange
                            }
                        />

                    </div>


                    <div className="modal-footer">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Adding..."
                                : "Add Employee"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}


function EditEmployeeModal({
    employee,
    onClose,
    onUpdated
}) {

    const [form, setForm] = useState({
        employee_id:
            employee.employee_id || "",

        name:
            employee.name || "",

        email:
            employee.email || "",

        phone:
            employee.phone || "",

        department:
            employee.department || "",

        designation:
            employee.designation || "",

        cost_center:
            employee.cost_center || "",

        joining_date:
            employee.joining_date || "",

        status:
            employee.status || "ACTIVE"
    });

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    const handleChange = (e) => {

        setForm({
            ...form,

            [e.target.name]:
                e.target.value
        });
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");

        try {

            setSaving(true);

            await api.put(
                `/employees/${employee.id}`,
                form
            );

            onUpdated();

        } catch (error) {

            setError(
                error.response?.data?.message ||
                "Failed to update employee"
            );

        } finally {

            setSaving(false);
        }
    };


    return (

        <div className="modal-overlay">

            <div className="modal">

                <div className="modal-header">

                    <div>

                        <h2>
                            Edit Employee
                        </h2>

                        <p>
                            Update employee information.
                        </p>

                    </div>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                {error && (

                    <div className="form-error">
                        {error}
                    </div>

                )}


                <form
                    className="asset-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-grid">

                        <FormField
                            label="Employee ID"
                            name="employee_id"
                            value={
                                form.employee_id
                            }
                            onChange={
                                handleChange
                            }
                            required
                            disabled
                        />


                        <FormField
                            label="Full Name"
                            name="name"
                            value={
                                form.name
                            }
                            onChange={
                                handleChange
                            }
                            required
                        />


                        <FormField
                            label="Email"
                            name="email"
                            type="email"
                            value={
                                form.email
                            }
                            onChange={
                                handleChange
                            }
                            required
                            disabled
                        />


                        <FormField
                            label="Phone"
                            name="phone"
                            value={
                                form.phone
                            }
                            onChange={
                                handleChange
                            }
                        />


                        <FormField
                            label="Department"
                            name="department"
                            value={
                                form.department
                            }
                            onChange={
                                handleChange
                            }
                        />


                        <FormField
                            label="Designation"
                            name="designation"
                            value={
                                form.designation
                            }
                            onChange={
                                handleChange
                            }
                        />


                        <FormField
                            label="Cost Center"
                            name="cost_center"
                            value={
                                form.cost_center
                            }
                            onChange={
                                handleChange
                            }
                        />


                        <FormField
                            label="Joining Date"
                            name="joining_date"
                            type="date"
                            value={
                                form.joining_date
                            }
                            onChange={
                                handleChange
                            }
                        />


                        <div className="form-field">

                            <label>
                                Status
                            </label>

                            <select
                                name="status"
                                value={
                                    form.status
                                }
                                onChange={
                                    handleChange
                                }
                            >

                                <option value="ACTIVE">
                                    Active
                                </option>

                                <option value="INACTIVE">
                                    Inactive
                                </option>

                            </select>

                        </div>

                    </div>


                    <div className="modal-footer">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

function DeleteEmployeeModal({
    employee,
    onClose,
    onConfirm
}) {

    return (

        <div className="modal-overlay">

            <div className="modal delete-modal">

                <div className="modal-header">

                    <div>

                        <h2>
                            Delete Employee
                        </h2>

                        <p>
                            Are you sure you want to
                            delete this employee?
                        </p>

                    </div>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                <div className="delete-content">

                    <strong>
                        {employee.name}
                    </strong>

                    <span>
                        {employee.employee_id}
                    </span>

                    <p>
                        This action cannot be undone.
                    </p>

                </div>


                <div className="modal-footer">

                    <button
                        type="button"
                        className="cancel-button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={onConfirm}
                    >
                        Delete Employee
                    </button>

                </div>

            </div>

        </div>
    );
}


function FormField({
    label,
    name,
    type = "text",
    value,
    onChange,
    required = false,
    disabled = false,
    readOnly = false
}) {

    return (
        <div className="form-field">

            <label>
                {label}
                {required && " *"}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                readOnly={readOnly}
            />

        </div>
    );
}


export default Employees;