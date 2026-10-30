import { useEffect, useMemo, useState } from "react";

import {
    Users,
    UserPlus,
    Search,
    Shield,
    UserCheck,
    UserX,
    Trash2,
    Edit3,
    X,
    RefreshCw,
    Mail,
    Building2,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";


function UserManagement() {

    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [createForm, setCreateForm] = useState({
        name: "",
        email: "",
        role: "IT",
    });

    const [newRole, setNewRole] = useState("IT");


    // ============================================================
    // LOAD USERS
    // ============================================================

    const loadUsers = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await api.get("/users");

            setUsers(
                response.data?.users || []
            );

        } catch (err) {

            console.error(
                "Failed to load users:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load users."
            );

        } finally {

            setLoading(false);

        }
    };


    // ============================================================
    // LOAD EMPLOYEES
    // ============================================================

    const loadEmployees = async () => {

        try {

            const response =
                await api.get("/employees");

            const data = response.data;

            if (Array.isArray(data)) {

                setEmployees(data);

            } else {

                setEmployees(
                    data?.employees || []
                );

            }

        } catch (err) {

            console.error(
                "Failed to load employees:",
                err
            );

        }
    };


    useEffect(() => {

        loadUsers();
        loadEmployees();

    }, []);


    // ============================================================
    // ROLE PERMISSIONS
    // ============================================================

    const canCreateRole = (role) => {

        if (
            currentUser?.role === "SUPERUSER"
        ) {

            return [
                "SUPERUSER",
                "ADMIN",
                "IT",
            ].includes(role);

        }

        if (
            currentUser?.role === "ADMIN"
        ) {

            return [
                "ADMIN",
                "IT",
            ].includes(role);

        }

        return false;
    };


    // ============================================================
    // MODIFY USER PERMISSION
    // ============================================================

    const canModifyUser = (target) => {

        if (!target) {
            return false;
        }

        if (
            currentUser?.id === target.id
        ) {
            return false;
        }

        if (
            currentUser?.role === "SUPERUSER"
        ) {

            return target.role !== "SUPERUSER";

        }

        if (
            currentUser?.role === "ADMIN"
        ) {

            return [
                "IT",
            ].includes(target.role);

        }

        return false;
    };


    // ============================================================
    // DELETE USER PERMISSION
    // ============================================================

    const canDeleteUser = (target) => {

        if (!target) {
            return false;
        }

        if (
            currentUser?.id === target.id
        ) {
            return false;
        }

        if (
            target.role === "SUPERUSER"
        ) {
            return false;
        }

        if (
            currentUser?.role === "SUPERUSER"
        ) {
            return true;
        }

        if (
            currentUser?.role === "ADMIN"
        ) {

            return [
                "IT",
            ].includes(target.role);

        }

        return false;
    };


    // ============================================================
    // FILTER USERS
    // ============================================================

    const filteredUsers = useMemo(() => {

        const term =
            search.trim().toLowerCase();

        return users.filter((item) => {

            const matchesSearch =
                !term ||
                item.name
                    ?.toLowerCase()
                    .includes(term) ||
                item.email
                    ?.toLowerCase()
                    .includes(term);

            const matchesRole =
                roleFilter === "ALL" ||
                item.role === roleFilter;

            const matchesStatus =
                statusFilter === "ALL" ||
                (
                    statusFilter === "ACTIVE" &&
                    item.is_active
                ) ||
                (
                    statusFilter === "INACTIVE" &&
                    !item.is_active
                );

            return (
                matchesSearch &&
                matchesRole &&
                matchesStatus
            );

        });

    }, [
        users,
        search,
        roleFilter,
        statusFilter,
    ]);


    // ============================================================
    // CREATE USER
    // ============================================================

    const handleCreateUser = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        const email = form.email.trim().toLowerCase();

        if (!email.endsWith("@abylle.com")) {
            setError(
                "Only @abylle.com email addresses are allowed."
            );
            return;
        }

        if (!createForm.name.trim()) {

            setError(
                "Name is required."
            );

            return;
        }

        if (!createForm.email.trim()) {

            setError(
                "Email is required."
            );

            return;
        }

        if (!createForm.role) {

            setError(
                "Please select a role."
            );

            return;
        }

        try {

            setSaving(true);

            const payload = {
                name: createForm.name.trim(),
                email: createForm.email
                    .trim()
                    .toLowerCase(),
                role: createForm.role,
            };

            const response =
                await api.post(
                    "/users",
                    payload
                );

            setSuccess(
                response.data?.message ||
                "User account created successfully."
            );

            setShowCreateModal(false);

            setCreateForm({
                name: "",
                email: "",
                role:
                    currentUser?.role ===
                        "SUPERUSER"
                        ? "ADMIN"
                        : "IT",
            });

            await loadUsers();

        } catch (err) {

            console.error(
                "Create user error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to create user."
            );

        } finally {

            setSaving(false);

        }
    };


    // ============================================================
    // CHANGE ROLE
    // ============================================================

    const openRoleModal = (target) => {

        setSelectedUser(target);
        setNewRole(target.role);

        setError("");
        setShowRoleModal(true);
    };


    const handleRoleChange = async () => {

        if (!selectedUser) {
            return;
        }

        setError("");
        setSuccess("");

        try {

            setSaving(true);

            const response =
                await api.put(
                    `/users/${selectedUser.id}/role`,
                    {
                        role: newRole,
                    }
                );

            setSuccess(
                response.data?.message ||
                "User role updated successfully."
            );

            setShowRoleModal(false);
            setSelectedUser(null);

            await loadUsers();

        } catch (err) {

            console.error(
                "Role update error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to change user role."
            );

        } finally {

            setSaving(false);

        }
    };


    // ============================================================
    // CHANGE STATUS
    // ============================================================

    const handleStatusChange = async (target) => {

        if (!canModifyUser(target)) {
            return;
        }

        setError("");
        setSuccess("");

        try {

            const response =
                await api.put(
                    `/users/${target.id}/status`,
                    {
                        is_active:
                            !target.is_active,
                    }
                );

            setSuccess(
                response.data?.message ||
                "User status updated successfully."
            );

            await loadUsers();

        } catch (err) {

            console.error(
                "Status update error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to update user status."
            );
        }
    };


    // ============================================================
    // DELETE USER
    // ============================================================

    const openDeleteModal = (target) => {

        setSelectedUser(target);

        setError("");

        setShowDeleteModal(true);
    };


    const handleDelete = async () => {

        if (!selectedUser) {
            return;
        }

        try {

            setSaving(true);

            setError("");
            setSuccess("");

            const response =
                await api.delete(
                    `/users/${selectedUser.id}`
                );

            setSuccess(
                response.data?.message ||
                "User account deleted successfully."
            );

            setShowDeleteModal(false);
            setSelectedUser(null);

            await loadUsers();

        } catch (err) {

            console.error(
                "Delete user error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to delete user."
            );

        } finally {

            setSaving(false);

        }
    };


    // ============================================================
    // STATS
    // ============================================================

    const totalUsers =
        users.length;

    const adminCount =
        users.filter(
            (u) =>
                u.role === "ADMIN" ||
                u.role === "SUPERUSER"
        ).length;

    /*
     * Employees are now stored in the employees table.
     * They are NOT users anymore.
     */
    const employeeCount =
        employees.length;

    const itCount =
        users.filter(
            (u) =>
                u.role === "IT"
        ).length;

    const activeUserCount =
        users.filter(
            (u) => u.is_active
        ).length;

    const activeEmployeeCount =
        employees.filter(
            (employee) =>
                employee.status === "ACTIVE"
        ).length;

    const activeCount =
        activeUserCount +
        activeEmployeeCount;


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="user-management">

            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <div className="page-header">

                <div>

                    <h1>
                        User Management
                    </h1>

                    <p>
                        Manage system accounts,
                        roles and access
                    </p>

                </div>


                <button
                    className="add-button"
                    onClick={() => {

                        setError("");
                        setSuccess("");

                        setCreateForm({
                            name: "",
                            email: "",
                            role:
                                currentUser?.role ===
                                    "SUPERUSER"
                                    ? "ADMIN"
                                    : "IT",
                        });

                        setShowCreateModal(true);

                    }}
                >

                    <UserPlus size={18} />

                    Create User

                </button>

            </div>


            {/* ================================================= */}
            {/* ALERTS */}
            {/* ================================================= */}

            {error && (

                <div className="user-alert user-alert-error">

                    <span>
                        {error}
                    </span>

                    <button
                        onClick={() =>
                            setError("")
                        }
                    >
                        <X size={17} />
                    </button>

                </div>

            )}


            {success && (

                <div className="user-alert user-alert-success">

                    <span>
                        {success}
                    </span>

                    <button
                        onClick={() =>
                            setSuccess("")
                        }
                    >
                        <X size={17} />
                    </button>

                </div>

            )}


            {/* ================================================= */}
            {/* STAT CARDS */}
            {/* ================================================= */}

            <div className="user-stats-grid">

                <UserStat
                    icon={Users}
                    title="System Users"
                    value={totalUsers}
                />

                <UserStat
                    icon={Shield}
                    title="Administrators"
                    value={adminCount}
                />

                <UserStat
                    icon={UserCheck}
                    title="Employees"
                    value={employeeCount}
                />

                <UserStat
                    icon={Building2}
                    title="IT Accounts"
                    value={itCount}
                />

                <UserStat
                    icon={UserCheck}
                    title="Active Accounts"
                    value={activeCount}
                />

            </div>


            {/* ================================================= */}
            {/* TABLE PANEL */}
            {/* ================================================= */}

            <div className="users-panel">

                <div className="users-toolbar">

                    <div className="user-search">

                        <Search size={18} />

                        <input
                            type="text"
                            placeholder="Search name or email..."
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    <select
                        value={roleFilter}
                        onChange={(e) =>
                            setRoleFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="ALL">
                            All Roles
                        </option>

                        <option value="SUPERUSER">
                            Superuser
                        </option>

                        <option value="ADMIN">
                            Admin
                        </option>

                        <option value="IT">
                            IT
                        </option>

                    </select>


                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="ALL">
                            All Status
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="INACTIVE">
                            Inactive
                        </option>

                    </select>


                    <button
                        className="refresh-users-button"
                        onClick={() => {

                            loadUsers();
                            loadEmployees();

                        }}
                    >

                        <RefreshCw size={17} />

                    </button>

                </div>


                {/* ================================================= */}
                {/* USERS TABLE */}
                {/* ================================================= */}

                <div className="users-table-container">

                    <table className="users-table">

                        <thead>

                            <tr>

                                <th>
                                    ID
                                </th>

                                <th>
                                    User
                                </th>

                                <th>
                                    Email
                                </th>

                                <th>
                                    Role
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Password
                                </th>

                                <th>
                                    Created
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="8"
                                        className="users-empty"
                                    >
                                        Loading users...
                                    </td>

                                </tr>

                            ) : filteredUsers.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="8"
                                        className="users-empty"
                                    >
                                        No users found.
                                    </td>

                                </tr>

                            ) : (

                                filteredUsers.map(
                                    (item) => {

                                        const canModify =
                                            canModifyUser(
                                                item
                                            );

                                        const canDelete =
                                            canDeleteUser(
                                                item
                                            );

                                        return (

                                            <tr
                                                key={
                                                    item.id
                                                }
                                            >

                                                <td>
                                                    #{item.id}
                                                </td>


                                                <td>

                                                    <div className="user-name-cell">

                                                        <div className="user-avatar">

                                                            {item.name
                                                                ?.charAt(0)
                                                                ?.toUpperCase()}

                                                        </div>

                                                        <div>

                                                            <strong>
                                                                {item.name}
                                                            </strong>

                                                        </div>

                                                    </div>

                                                </td>


                                                <td>

                                                    <div className="email-cell">

                                                        <Mail
                                                            size={15}
                                                        />

                                                        {item.email}

                                                    </div>

                                                </td>


                                                <td>

                                                    <RoleBadge
                                                        role={
                                                            item.role
                                                        }
                                                    />

                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            item.is_active
                                                                ? "status-badge status-active"
                                                                : "status-badge status-inactive"
                                                        }
                                                    >

                                                        {item.is_active
                                                            ? "Active"
                                                            : "Inactive"}

                                                    </span>

                                                </td>


                                                <td>

                                                    {item.must_change_password ? (

                                                        <span className="password-status password-pending">
                                                            Change required
                                                        </span>

                                                    ) : (

                                                        <span className="password-status password-ok">
                                                            Set
                                                        </span>

                                                    )}

                                                </td>


                                                <td>

                                                    {item.created_at
                                                        ? new Date(
                                                            item.created_at
                                                        ).toLocaleDateString()
                                                        : "-"}

                                                </td>


                                                <td>

                                                    <div className="user-actions">

                                                        {canModify && (

                                                            <>

                                                                <button
                                                                    className="user-action-button"
                                                                    title="Change role"
                                                                    onClick={() =>
                                                                        openRoleModal(
                                                                            item
                                                                        )
                                                                    }
                                                                >

                                                                    <Edit3
                                                                        size={16}
                                                                    />

                                                                </button>


                                                                <button
                                                                    className="user-action-button"
                                                                    title={
                                                                        item.is_active
                                                                            ? "Deactivate"
                                                                            : "Activate"
                                                                    }
                                                                    onClick={() =>
                                                                        handleStatusChange(
                                                                            item
                                                                        )
                                                                    }
                                                                >

                                                                    {item.is_active ? (

                                                                        <UserX
                                                                            size={16}
                                                                        />

                                                                    ) : (

                                                                        <UserCheck
                                                                            size={16}
                                                                        />

                                                                    )}

                                                                </button>

                                                            </>

                                                        )}


                                                        {canDelete && (

                                                            <button
                                                                className="user-action-button user-delete-button"
                                                                title="Delete user"
                                                                onClick={() =>
                                                                    openDeleteModal(
                                                                        item
                                                                    )
                                                                }
                                                            >

                                                                <Trash2
                                                                    size={16}
                                                                />

                                                            </button>

                                                        )}


                                                        {!canModify &&
                                                            !canDelete && (

                                                                <span className="protected-user">
                                                                    Protected
                                                                </span>

                                                            )}

                                                    </div>

                                                </td>

                                            </tr>

                                        );

                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* ================================================= */}
            {/* CREATE USER MODAL */}
            {/* ================================================= */}

            {showCreateModal && (

                <div
                    className="user-modal-overlay"
                    onClick={() =>
                        setShowCreateModal(false)
                    }
                >

                    <div
                        className="user-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="user-modal-header">

                            <div>

                                <h2>
                                    Create User Account
                                </h2>

                                <p>
                                    A temporary password
                                    will be sent by email.
                                </p>

                            </div>

                            <button
                                className="user-modal-close"
                                onClick={() =>
                                    setShowCreateModal(false)
                                }
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleCreateUser
                            }
                        >

                            <div className="user-form-grid">

                                <div className="user-form-group">

                                    <label>
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            createForm.name
                                        }
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                name:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="Enter full name"
                                    />

                                </div>


                                <div className="user-form-group">

                                    <label>
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        value={
                                            createForm.email
                                        }
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                email:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="Enter email address"
                                    />

                                </div>


                                <div className="user-form-group">

                                    <label>
                                        Account Role
                                    </label>

                                    <select
                                        value={
                                            createForm.role
                                        }
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                role:
                                                    e.target.value,
                                            })
                                        }
                                    >

                                        {[
                                            "SUPERUSER",
                                            "ADMIN",
                                            "IT",
                                        ]
                                            .filter(
                                                canCreateRole
                                            )
                                            .map(
                                                (role) => (

                                                    <option
                                                        key={role}
                                                        value={role}
                                                    >
                                                        {formatRole(
                                                            role
                                                        )}
                                                    </option>

                                                )
                                            )}

                                    </select>

                                </div>

                            </div>


                            <div className="user-modal-info">

                                <Shield size={18} />

                                <span>
                                    The account will start
                                    with a temporary
                                    password and require a
                                    password change during
                                    first login.
                                </span>

                            </div>


                            <div className="user-modal-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() =>
                                        setShowCreateModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >

                                    {saving
                                        ? "Creating..."
                                        : "Create Account"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* ================================================= */}
            {/* ROLE MODAL */}
            {/* ================================================= */}

            {showRoleModal &&
                selectedUser && (

                    <div
                        className="user-modal-overlay"
                        onClick={() =>
                            setShowRoleModal(false)
                        }
                    >

                        <div
                            className="user-modal user-role-modal"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >

                            <div className="user-modal-header">

                                <div>

                                    <h2>
                                        Change User Role
                                    </h2>

                                    <p>
                                        {selectedUser.name}
                                    </p>

                                </div>


                                <button
                                    className="user-modal-close"
                                    onClick={() =>
                                        setShowRoleModal(
                                            false
                                        )
                                    }
                                >
                                    <X size={20} />
                                </button>

                            </div>


                            <div className="user-form-group">

                                <label>
                                    New Role
                                </label>

                                <select
                                    value={newRole}
                                    onChange={(e) =>
                                        setNewRole(
                                            e.target.value
                                        )
                                    }
                                >

                                    {[
                                        "SUPERUSER",
                                        "ADMIN",
                                        "IT",
                                    ].map(
                                        (role) => {

                                            if (
                                                role ===
                                                "SUPERUSER"
                                            ) {

                                                return currentUser?.role ===
                                                    "SUPERUSER" ? (

                                                    <option
                                                        key={role}
                                                        value={role}
                                                    >
                                                        Superuser
                                                    </option>

                                                ) : null;

                                            }

                                            return (

                                                <option
                                                    key={role}
                                                    value={role}
                                                >
                                                    {formatRole(
                                                        role
                                                    )}
                                                </option>

                                            );

                                        }
                                    )}

                                </select>

                            </div>


                            <div className="user-modal-warning">

                                <Shield size={18} />

                                <span>
                                    Changing a role will
                                    require the user to set
                                    a new password.
                                </span>

                            </div>


                            <div className="user-modal-actions">

                                <button
                                    className="secondary-button"
                                    onClick={() =>
                                        setShowRoleModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    className="primary-button"
                                    disabled={saving}
                                    onClick={
                                        handleRoleChange
                                    }
                                >

                                    {saving
                                        ? "Updating..."
                                        : "Update Role"}

                                </button>

                            </div>

                        </div>

                    </div>

                )}


            {/* ================================================= */}
            {/* DELETE MODAL */}
            {/* ================================================= */}

            {showDeleteModal &&
                selectedUser && (

                    <div
                        className="user-modal-overlay"
                        onClick={() =>
                            setShowDeleteModal(false)
                        }
                    >

                        <div
                            className="user-modal user-role-modal delete-user-modal"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >

                            <div className="delete-user-icon">

                                <Trash2 size={25} />

                            </div>


                            <h2>
                                Delete User?
                            </h2>


                            <p>

                                Are you sure you want
                                to permanently delete{" "}

                                <strong>
                                    {selectedUser.name}
                                </strong>

                                ?

                                <br />

                                This action cannot be
                                undone.

                            </p>


                            <div className="user-modal-actions">

                                <button
                                    className="secondary-button"
                                    onClick={() =>
                                        setShowDeleteModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    className="danger-button"
                                    disabled={saving}
                                    onClick={
                                        handleDelete
                                    }
                                >

                                    {saving
                                        ? "Deleting..."
                                        : "Delete User"}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </div>
    );
}


// ================================================================
// STAT
// ================================================================

function UserStat({
    icon: Icon,
    title,
    value,
}) {

    return (

        <div className="user-stat-card">

            <div className="user-stat-icon">

                <Icon size={21} />

            </div>

            <div>

                <p>
                    {title}
                </p>

                <h2>
                    {value}
                </h2>

            </div>

        </div>

    );
}


// ================================================================
// ROLE BADGE
// ================================================================

function RoleBadge({ role }) {

    return (

        <span
            className={`role-badge role-${role?.toLowerCase()}`}
        >
            {formatRole(role)}
        </span>

    );

}


// ================================================================
// FORMAT ROLE
// ================================================================

function formatRole(role) {

    if (!role) {
        return "";
    }

    return (
        role.charAt(0) +
        role.slice(1).toLowerCase()
    );
}


export default UserManagement;