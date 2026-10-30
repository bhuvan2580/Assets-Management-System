import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
    Plus,
    Search,
    Laptop,
    Monitor,
    Keyboard,
    Package,
    MoreVertical,
    X,
    Pencil,
    Trash2,
    FileSpreadsheet,
    Upload
} from "lucide-react";

import api from "../services/api";


function Assets() {

    const [assets, setAssets] = useState([]);

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("ALL");

    const [showModal, setShowModal] = useState(false);

    const [loading, setLoading] = useState(true);

    const [editingAsset, setEditingAsset] = useState(null);
    const [deletingAsset, setDeletingAsset] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);

    const firstLoad = useRef(true);

    const navigate = useNavigate();


    const loadAssignmentData = async () => {
        try {
            const [employeesResponse, assignmentsResponse] =
                await Promise.all([
                    api.get("/employees"),
                    api.get("/assignments")
                ]);

            setEmployees(employeesResponse.data || []);
            setAssignments(assignmentsResponse.data || []);

        } catch (error) {
            console.error(
                "Failed to load employee/assignment data:",
                error
            );
        }
    };


    const loadAssets = async () => {
        try {
            setLoading(true);

            const response = await api.get("/assets", {
                params: {
                    search: search || undefined,
                    status: status !== "ALL" ? status : undefined
                },
                timeout: 10000
            });

            setAssets(Array.isArray(response.data) ? response.data : []);

        } catch (error) {
            console.error("Failed to load assets:", error);

            if (error.code === "ECONNABORTED") {
                console.error("Asset request timed out. Check whether the backend is running.");
            }

            setAssets([]);
        } finally {
            setLoading(false);
        }
    };


    const downloadExcel = async () => {
        try {
            /*
             * IMPORTANT:
             * Fetch all assets without search/status filters.
             * This makes sure the Excel contains ALL current assets,
             * including AVAILABLE and ASSIGNED assets.
             */
            const response = await api.get("/assets", {
                timeout: 15000
            });

            const allAssets = Array.isArray(response.data)
                ? response.data
                : [];

            if (allAssets.length === 0) {
                alert("No assets available to export.");
                return;
            }

            const formatDate = (value) => {
                if (!value) {
                    return "";
                }

                const date = new Date(value);

                if (Number.isNaN(date.getTime())) {
                    return value;
                }

                return date.toLocaleDateString("en-GB");
            };

            const formatStatus = (value) => {
                if (!value) {
                    return "";
                }

                return value
                    .replaceAll("_", " ")
                    .replace(
                        /\w\S*/g,
                        (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase()
                    );
            };

            /*
             * Excel columns requested by you
             */
            const excelData = allAssets.map((asset) => ({
                "Asset Register": asset.id || "",
                "Vendor Name": asset.vendor_name || "",
                "Asset Tag": asset.asset_tag || "",
                "Serial number": asset.serial_number || "",
                "Item Type": asset.asset_type || "",
                "Brand": asset.brand || "",
                "Model": asset.model || "",
                "Date of arrived": formatDate(asset.received_date),
                "Item Specification": [
                    asset.processor,
                    asset.ram,
                    asset.storage,
                    asset.display,
                    asset.operating_system
                ]
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ""
                    )
                    .join(" / "),
                "Processor": asset.processor || "",
                "RAM": asset.ram || "",
                "Storage": asset.storage || "",
                "Display": asset.display || "",
                "Description": asset.description || "",
                "OS": asset.operating_system || "",
                "Asset status": formatStatus(asset.status),
                "Mode of Transport": asset.mode_of_transport || "",
                "Warranty Status": asset.warranty_status || "",
                "Warranty Expiry Date": formatDate(asset.warranty_end),
                "Department": asset.department || "",
                "Rental Cost": asset.rental_cost ?? "",
                "Location": asset.location || "",
                "Remarks": asset.remarks || ""
            }));

            /*
             * Create worksheet
             */
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            /*
             * Set column widths
             */
            worksheet["!cols"] = [
                { wch: 15 }, // Asset Register
                { wch: 25 }, // Vendor Name
                { wch: 18 }, // Asset Tag
                { wch: 22 }, // Serial number
                { wch: 18 }, // Item Type
                { wch: 18 }, // Brand
                { wch: 20 }, // Model
                { wch: 18 }, // Date of arrived
                { wch: 30 }, // Item Specification
                { wch: 22 }, // Processor
                { wch: 12 }, // RAM
                { wch: 18 }, // Storage
                { wch: 18 }, // Display
                { wch: 35 }, // Description
                { wch: 20 }, // OS
                { wch: 18 }, // Asset status
                { wch: 22 }, // Mode of Transport
                { wch: 22 }, // Warranty Status
                { wch: 22 }, // Warranty Expiry Date
                { wch: 20 }, // Department
                { wch: 15 }, // Rental Cost
                { wch: 20 }, // Location
                { wch: 35 }  // Remarks
            ];

            /*
             * Create workbook
             */
            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Asset Register"
            );

            /*
             * Generate filename
             */
            const today = new Date();

            const dateString =
                `${today.getFullYear()}-${String(
                    today.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    today.getDate()
                ).padStart(2, "0")}`;

            /*
             * Download Excel file
             */
            XLSX.writeFile(
                workbook,
                `Asset_Register_${dateString}.xlsx`
            );

        } catch (error) {

            console.error(
                "Failed to export assets:",
                error
            );

            alert(
                "Failed to download asset register."
            );
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAssets(firstLoad.current);

            if (firstLoad.current) {
                loadAssignmentData();
                firstLoad.current = false;
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, status]);

    const handleAssetClick = async (asset) => {
        try {
            // Get the latest asset information
            const response = await api.get(
                `/assets/${asset.id}`
            );

            setSelectedAsset(response.data);

        } catch (error) {
            console.error(
                "Failed to load asset details:",
                error
            );

            // Fallback to the asset already loaded in the table
            setSelectedAsset(asset);
        }

        setActionMenu(null);
    };

    const getAssignedEmployee = (assetId) => {
        const activeAssignment = assignments.find(
            (assignment) =>
                Number(assignment.asset_id) === Number(assetId) &&
                !assignment.actual_return_date
        );

        if (!activeAssignment) {
            return null;
        }

        return employees.find(
            (employee) =>
                Number(employee.id) ===
                Number(activeAssignment.employee_id)
        ) || null;
    };


    const getIcon = (type) => {

        const value =
            type?.toLowerCase();

        if (
            value?.includes("laptop")
        ) {
            return Laptop;
        }

        if (
            value?.includes("monitor")
        ) {
            return Monitor;
        }

        if (
            value?.includes("keyboard")
        ) {
            return Keyboard;
        }

        return Package;
    };


    return (
        <div className="assets-page">

            <div className="page-header">

                <div>
                    <h1>Assets</h1>

                    <p>
                        Manage all IT assets
                        across Abylle Solutions
                    </p>
                </div>

                <div className="page-header-actions">

                    <button
                        className="download-excel-button"
                        onClick={downloadExcel}
                        type="button"
                    >
                        <FileSpreadsheet size={17} />
                        Download Excel
                    </button>


                    <button
                        className="download-excel-button"
                        onClick={() => navigate("/assets/upload")}
                        type="button"
                    >
                        <Upload size={17} />
                        Upload Assets
                    </button>


                    <button
                        className="add-button"
                        onClick={() => setShowModal(true)}
                        type="button"
                    >
                        <Plus size={17} />
                        Add Asset
                    </button>

                </div>

            </div>


            <div className="asset-toolbar">

                <div className="asset-search">

                    <Search size={17} />

                    <input
                        type="text"
                        placeholder="Search by asset tag, serial number, brand..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>


                <div className="status-filters">
                    {[
                        { value: "ALL", label: "All" },
                        { value: "AVAILABLE", label: "Available" },
                        { value: "ASSIGNED", label: "Assigned" },
                        { value: "UNDER_REPAIR", label: "Repair" },
                        { value: "LOST", label: "Lost" },
                        { value: "RETIRED", label: "Retired" }
                    ].map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={
                                status === item.value
                                    ? "filter active"
                                    : "filter"
                            }
                            onClick={() => setStatus(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

            </div>


            <div className="assets-table-container">

                {loading ? (

                    <div className="empty-state">
                        Loading assets...
                    </div>

                ) : assets.length === 0 ? (

                    <div className="empty-state">

                        <Package
                            size={40}
                        />

                        <h3>
                            No assets found
                        </h3>

                        <p>
                            Add your first
                            asset to get started.
                        </p>

                    </div>

                ) : (

                    <table className="assets-table">

                        <thead>

                            <tr>

                                <th>Asset</th>

                                <th>Type</th>

                                <th>Serial Number</th>

                                <th>Vendor</th>

                                <th>Location</th>

                                <th>Status</th>

                                <th></th>

                            </tr>

                        </thead>


                        <tbody>

                            {assets.map((asset) => {

                                const Icon =
                                    getIcon(
                                        asset.asset_type
                                    );

                                return (

                                    <tr
                                        key={asset.id}
                                        className="asset-clickable-row"
                                        onClick={() => handleAssetClick(asset)}
                                    >

                                        <td>

                                            <div className="asset-name">

                                                <div className="asset-type-icon">

                                                    <Icon
                                                        size={18}
                                                    />

                                                </div>

                                                <div>

                                                    <strong>
                                                        {
                                                            asset.asset_tag
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            asset.brand
                                                        }{" "}
                                                        {
                                                            asset.model
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        <td>
                                            {
                                                asset.asset_type
                                            }
                                        </td>


                                        <td>
                                            {
                                                asset.serial_number
                                                || "—"
                                            }
                                        </td>


                                        <td>
                                            {
                                                asset.vendor_name
                                                || "—"
                                            }
                                        </td>


                                        <td>
                                            {
                                                asset.location
                                                || "—"
                                            }
                                        </td>


                                        <td>

                                            <span
                                                className={`status-badge ${asset.status.toLowerCase()}`}
                                            >
                                                {
                                                    formatStatus(
                                                        asset.status
                                                    )
                                                }
                                            </span>

                                        </td>


                                        <td>

                                            <div className="asset-actions">

                                                <button
                                                    type="button"
                                                    className="table-action"
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        setActionMenu(
                                                            actionMenu === asset.id
                                                                ? null
                                                                : asset.id
                                                        );
                                                    }}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {actionMenu === asset.id && (
                                                    <div
                                                        className="action-menu"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingAsset(asset);
                                                                setActionMenu(null);
                                                            }}
                                                        >
                                                            <Pencil size={16} />
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete-action"
                                                            onClick={() => {
                                                                setDeletingAsset(asset);
                                                                setActionMenu(null);
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                            Delete
                                                        </button>

                                                    </div>
                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                );

                            })}

                        </tbody>

                    </table>

                )}

            </div>


            {showModal && (

                <AddAssetModal
                    onClose={() =>
                        setShowModal(false)
                    }
                    onCreated={() => {
                        setShowModal(false);
                        loadAssets(false);
                    }}
                />

            )}

            {editingAsset && (
                <EditAssetModal
                    asset={editingAsset}
                    employee={getAssignedEmployee(editingAsset.id)}
                    onClose={() =>
                        setEditingAsset(null)
                    }
                    onUpdated={(updatedAsset) => {
                        setAssets((prevAssets) =>
                            prevAssets.map((item) =>
                                item.id === updatedAsset.id
                                    ? updatedAsset
                                    : item
                            )
                        );

                        setEditingAsset(null);

                        if (
                            selectedAsset &&
                            selectedAsset.id === updatedAsset.id
                        ) {
                            setSelectedAsset(updatedAsset);
                        }
                    }}
                />
            )}

            {deletingAsset && (
                <div className="modal-overlay">

                    <div className="delete-modal">

                        <div className="delete-icon">
                            <Trash2 size={22} />
                        </div>

                        <h2>Delete Asset?</h2>

                        <p>
                            Are you sure you want to delete{" "}
                            <strong>
                                {deletingAsset.asset_tag}
                            </strong>
                            ?
                        </p>

                        <p className="delete-warning">
                            This action cannot be undone.
                        </p>

                        <div className="modal-footer">

                            <button
                                className="cancel-button"
                                onClick={() =>
                                    setDeletingAsset(null)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="delete-button"
                                onClick={async () => {

                                    try {

                                        await api.delete(
                                            `/assets/${deletingAsset.id}`
                                        );

                                        setDeletingAsset(null);

                                        await loadAssets(false);

                                    } catch (error) {

                                        alert(
                                            error.response?.data?.message ||
                                            "Failed to delete asset"
                                        );

                                    }

                                }}
                            >
                                Delete Asset
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {selectedAsset && (
                <AssetDetailsModal
                    asset={selectedAsset}
                    employee={getAssignedEmployee(
                        selectedAsset.id
                    )}
                    onClose={() =>
                        setSelectedAsset(null)
                    }
                />
            )}

        </div>
    );
}


function AddAssetModal({
    onClose,
    onCreated
}) {

    const [vendors, setVendors] =
        useState([]);

    const [form, setForm] = useState({
        vendor_id: "",
        asset_tag: "",
        serial_number: "",
        asset_type: "Laptop",
        brand: "",
        model: "",

        received_date: "",

        processor: "",
        ram: "",
        storage: "",
        display: "",
        operating_system: "",

        description: "",

        status: "AVAILABLE",

        mode_of_transport: "",

        warranty_status: "ON WARRANTY",

        warranty_end: "",

        department: "",

        rental_cost: "",

        location: "",

        remarks: ""
    });




    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    useEffect(() => {

        const loadVendors =
            async () => {

                try {

                    const response =
                        await api.get(
                            "/vendors"
                        );

                    setVendors(
                        response.data
                    );

                } catch (error) {

                    console.error(
                        error
                    );

                }

            };

        loadVendors();

    }, []);


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

            await api.post(
                "/assets",
                {
                    ...form,

                    vendor_id: Number(
                        form.vendor_id
                    ),

                    rental_cost: Number(
                        form.rental_cost
                    )
                }
            );

            onCreated();

        } catch (error) {

            setError(
                error.response?.data?.message ||
                "Failed to create asset"
            );

        } finally {

            setSaving(false);

        }
    };

    const today = new Date();

    const todayString =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;


    return (

        <div className="modal-overlay">

            <div className="modal">

                <div className="modal-header">

                    <div>
                        <h2>
                            Add New Asset
                        </h2>

                        <p>
                            Register an asset
                            received from a vendor.
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
                    onSubmit={handleSubmit}
                    className="asset-form"
                >



                    <div className="form-grid">

                        <FormField
                            label="Asset Tag"
                            name="asset_tag"
                            value={form.asset_tag}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Item Type *</label>

                            <select
                                name="asset_type"
                                value={form.asset_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="Laptop">Laptop</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Monitor">Monitor</option>
                                <option value="Keyboard">Keyboard</option>
                                <option value="Mouse">Mouse</option>
                                <option value="Mobile Phone">Mobile Phone</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Printer">Printer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <FormField
                            label="Serial Number"
                            name="serial_number"
                            value={form.serial_number}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Brand"
                            name="brand"
                            value={form.brand}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Model"
                            name="model"
                            value={form.model}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Vendor Name *</label>

                            <select
                                name="vendor_id"
                                value={form.vendor_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select Vendor
                                </option>

                                {vendors.map((vendor) => (
                                    <option
                                        key={vendor.id}
                                        value={vendor.id}
                                    >
                                        {vendor.vendor_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <FormField
                            label="Date of Arrived"
                            name="received_date"
                            type="date"
                            value={form.received_date}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            required
                        />

                    </div>


                    {/* =====================================================
    ITEM SPECIFICATION
    ===================================================== */}

                    <fieldset className="item-specification">
                        <legend>Item Specification</legend>

                        <div className="specification-grid">

                            <div className="form-group">
                                <label>Processor</label>
                                <input
                                    type="text"
                                    name="processor"
                                    value={form.processor || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Intel Core i5"
                                />
                            </div>

                            <div className="form-group">
                                <label>RAM</label>
                                <input
                                    type="text"
                                    name="ram"
                                    value={form.ram || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 16 GB"
                                />
                            </div>

                            <div className="form-group">
                                <label>Storage</label>
                                <input
                                    type="text"
                                    name="storage"
                                    value={form.storage || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 512 GB SSD"
                                />
                            </div>

                            <div className="form-group">
                                <label>Display</label>
                                <input
                                    type="text"
                                    name="display"
                                    value={form.display || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 14 inch FHD"
                                />
                            </div>

                            <div className="form-group">
                                <label>OS</label>
                                <input
                                    type="text"
                                    name="operating_system"
                                    value={form.operating_system || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Windows 11"
                                />
                            </div>

                        </div>
                    </fieldset>


                    {/* =====================================================
    REMAINING ASSET DETAILS
    ===================================================== */}

                    <div className="form-grid">

                        <FormField
                            label="Department"
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Rental Cost"
                            name="rental_cost"
                            type="number"
                            value={form.rental_cost}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Mode of Transport"
                            name="mode_of_transport"
                            value={form.mode_of_transport}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Warranty Status *</label>

                            <select
                                name="warranty_status"
                                value={form.warranty_status || "ON WARRANTY"}
                                onChange={handleChange}
                                required
                            >
                                <option value="ON WARRANTY">
                                    On warranty
                                </option>

                                <option value="NOT ON WARRANTY">
                                    Not on warranty
                                </option>
                            </select>
                        </div>

                        <FormField
                            label="Warranty Expiry Date"
                            name="warranty_end"
                            type="date"
                            value={form.warranty_end}
                            onChange={handleChange}
                            min={todayString}
                            required
                        />

                        <FormField
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Description *</label>

                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows="3"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Remarks *</label>

                            <textarea
                                name="remarks"
                                value={form.remarks}
                                onChange={handleChange}
                                rows="3"
                                required
                            />
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
                                ? "Adding..."
                                : "Add Asset"}
                        </button>

                    </div>


                </form>

            </div>

        </div>
    );
}

export function AssetDetailsModal({
    asset,
    employee,
    onClose
}) {
    const displayValue = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return value;
    };

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
                className="asset-details-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                {/* HEADER */}
                <div className="asset-details-header">

                    <div>
                        <div className="asset-details-title">
                            <div className="asset-details-icon">
                                <Package size={22} />
                            </div>

                            <div>
                                <h2>
                                    {asset.asset_tag}
                                </h2>

                                <p>
                                    {displayValue(
                                        asset.brand
                                    )}{" "}
                                    {displayValue(
                                        asset.model
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        <X size={21} />
                    </button>

                </div>


                {/* STATUS */}
                <div className="asset-details-status">
                    <span className="detail-label">
                        Asset Status
                    </span>

                    <span
                        className={`status-badge ${asset.status?.toLowerCase()}`}
                    >
                        {formatStatus(
                            asset.status || "AVAILABLE"
                        )}
                    </span>
                </div>


                {/* BASIC INFORMATION */}
                <div className="asset-detail-section">

                    <h3>Asset Information</h3>

                    <div className="asset-detail-grid">

                        <DetailItem
                            label="Asset Tag"
                            value={asset.asset_tag}
                        />

                        <DetailItem
                            label="Item Type"
                            value={asset.asset_type}
                        />

                        <DetailItem
                            label="Serial Number"
                            value={asset.serial_number}
                        />

                        <DetailItem
                            label="Category"
                            value={asset.category}
                        />

                        <DetailItem
                            label="Brand"
                            value={asset.brand}
                        />

                        <DetailItem
                            label="Model"
                            value={asset.model}
                        />

                        <DetailItem
                            label="Vendor"
                            value={asset.vendor_name}
                        />

                        <DetailItem
                            label="Vendor ID"
                            value={asset.vendor_id}
                        />

                    </div>

                </div>


                {/* SPECIFICATIONS */}
                <div className="asset-detail-section">

                    <h3>Item Specification</h3>

                    <div className="asset-detail-grid">

                        <DetailItem
                            label="Processor"
                            value={asset.processor}
                        />

                        <DetailItem
                            label="RAM"
                            value={asset.ram}
                        />

                        <DetailItem
                            label="Storage"
                            value={asset.storage}
                        />

                        <DetailItem
                            label="Display"
                            value={asset.display}
                        />

                        <DetailItem
                            label="Operating System"
                            value={
                                asset.operating_system
                            }
                        />

                    </div>

                </div>


                {/* ASSIGNMENT */}
                <div className="asset-detail-section">

                    <h3>Assignment</h3>

                    <div className="asset-assignment-card">


                        <div className="assignment-person-info">
                            <span>
                                Employee Name:
                            </span>

                            <strong>
                                {employee ? employee.name : "Not Assigned"}
                            </strong>
                        </div>

                        <div className="assignment-person-info">
                            <span>
                                Employee ID:
                            </span>

                            <strong>
                                {employee ? employee.employee_id : "Not Assigned"}
                            </strong>
                        </div>

                    </div>

                </div>


                {/* PURCHASE / WARRANTY */}
                <div className="asset-detail-section">

                    <h3>Dates & Warranty</h3>

                    <div className="asset-detail-grid">

                        <DetailItem
                            label="Date of Arrived"
                            value={formatDate(
                                asset.received_date
                            )}
                        />

                        <DetailItem
                            label="Warranty Status"
                            value={asset.warranty_status}
                        />

                        <DetailItem
                            label="Warranty Expiry"
                            value={formatDate(
                                asset.warranty_end
                            )}
                        />

                        <DetailItem
                            label="Department"
                            value={asset.department}
                        />

                    </div>

                </div>


                {/* OTHER DETAILS */}
                <div className="asset-detail-section">

                    <h3>Other Details</h3>

                    <div className="asset-detail-grid">

                        <DetailItem
                            label="Rental Cost"
                            value={
                                asset.rental_cost !==
                                    null &&
                                    asset.rental_cost !==
                                    undefined
                                    ? `₹${Number(
                                        asset.rental_cost
                                    ).toLocaleString(
                                        "en-IN"
                                    )}`
                                    : "—"
                            }
                        />

                        <DetailItem
                            label="Mode of Transport"
                            value={
                                asset.mode_of_transport
                            }
                        />

                        <DetailItem
                            label="Location"
                            value={asset.location}
                        />

                    </div>

                </div>


                {/* DESCRIPTION */}
                <div className="asset-detail-section">

                    <h3>Description</h3>

                    <div className="asset-detail-text">
                        {displayValue(
                            asset.description
                        )}
                    </div>

                </div>


                {/* REMARKS */}
                <div className="asset-detail-section">

                    <h3>Remarks</h3>

                    <div className="asset-detail-text">
                        {displayValue(
                            asset.remarks
                        )}
                    </div>

                </div>


                <div className="asset-details-footer">

                    <button
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

/* ============================================================
   DETAIL ITEM
   ============================================================ */

function DetailItem({ label, value }) {
    return (
        <div className="detail-item">
            <span className="detail-item-label">
                {label}
            </span>

            <span className="detail-item-value">
                {value === null ||
                    value === undefined ||
                    value === ""
                    ? "—"
                    : value}
            </span>
        </div>
    );
}


function EditAssetModal({
    asset,
    employee,
    onClose,
    onUpdated
}) {

    const today = new Date();

    const todayString =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const [vendors, setVendors] =
        useState([]);

    const [form, setForm] = useState({
        vendor_id: asset.vendor_id || "",
        asset_tag: asset.asset_tag || "",
        serial_number: asset.serial_number || "",
        asset_type: asset.asset_type || "Laptop",
        brand: asset.brand || "",
        model: asset.model || "",
        received_date: asset.received_date || "",

        item_specification:
            asset.item_specification || "",

        processor: asset.processor || "",
        ram: asset.ram || "",
        storage: asset.storage || "",
        display: asset.display || "",
        operating_system:
            asset.operating_system || "",

        description:
            asset.description || "",

        status:
            asset.status || "AVAILABLE",

        mode_of_transport:
            asset.mode_of_transport || "",

        warranty_status:
            asset.warranty_status || "",

        warranty_end:
            asset.warranty_end || "",

        department:
            asset.department || "",

        rental_cost:
            asset.rental_cost ?? "",

        location:
            asset.location || "",

        remarks:
            asset.remarks || ""
    });

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    useEffect(() => {

        const loadVendors = async () => {

            try {

                const response =
                    await api.get("/vendors");

                setVendors(response.data);

            } catch (error) {

                console.error(
                    "Failed to load vendors:",
                    error
                );

            }

        };

        loadVendors();

    }, []);


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

            const response = await api.put(
                `/assets/${asset.id}`,
                {
                    ...form,
                    vendor_id:
                        form.vendor_id
                            ? Number(form.vendor_id)
                            : null,
                    rental_cost:
                        form.rental_cost !== ""
                            ? Number(form.rental_cost)
                            : null
                }
            );

            onUpdated(response.data.asset);



        } catch (error) {

            setError(
                error.response?.data?.message ||
                "Failed to update asset"
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
                            Edit Asset
                        </h2>

                        <p>
                            Update asset information
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
                    onSubmit={handleSubmit}
                    className="asset-form"
                >



                    <div className="form-grid">

                        <FormField
                            label="Asset Tag"
                            name="asset_tag"
                            value={form.asset_tag}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Item Type *</label>

                            <select
                                name="asset_type"
                                value={form.asset_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="Laptop">Laptop</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Monitor">Monitor</option>
                                <option value="Keyboard">Keyboard</option>
                                <option value="Mouse">Mouse</option>
                                <option value="Mobile Phone">Mobile Phone</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Printer">Printer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <FormField
                            label="Serial Number"
                            name="serial_number"
                            value={form.serial_number}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Brand"
                            name="brand"
                            value={form.brand}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Model"
                            name="model"
                            value={form.model}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Vendor Name *</label>

                            <select
                                name="vendor_id"
                                value={form.vendor_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select Vendor
                                </option>

                                {vendors.map((vendor) => (
                                    <option
                                        key={vendor.id}
                                        value={vendor.id}
                                    >
                                        {vendor.vendor_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <FormField
                            label="Date of Arrived"
                            name="received_date"
                            type="date"
                            value={form.received_date}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            required
                        />

                    </div>


                    {/* =====================================================
    ITEM SPECIFICATION
    ===================================================== */}

                    <fieldset className="item-specification">
                        <legend>Item Specification</legend>

                        <div className="specification-grid">

                            <div className="form-group">
                                <label>Processor</label>
                                <input
                                    type="text"
                                    name="processor"
                                    value={form.processor || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Intel Core i5"
                                />
                            </div>

                            <div className="form-group">
                                <label>RAM</label>
                                <input
                                    type="text"
                                    name="ram"
                                    value={form.ram || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 16 GB"
                                />
                            </div>

                            <div className="form-group">
                                <label>Storage</label>
                                <input
                                    type="text"
                                    name="storage"
                                    value={form.storage || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 512 GB SSD"
                                />
                            </div>

                            <div className="form-group">
                                <label>Display</label>
                                <input
                                    type="text"
                                    name="display"
                                    value={form.display || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. 14 inch FHD"
                                />
                            </div>

                            <div className="form-group">
                                <label>OS</label>
                                <input
                                    type="text"
                                    name="operating_system"
                                    value={form.operating_system || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Windows 11"
                                />
                            </div>

                        </div>
                    </fieldset>


                    {/* =====================================================
    REMAINING ASSET DETAILS
    ===================================================== */}

                    <div className="form-grid">

                        <FormField
                            label="Department"
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Rental Cost"
                            name="rental_cost"
                            type="number"
                            value={form.rental_cost}
                            onChange={handleChange}
                            required
                        />

                        <FormField
                            label="Mode of Transport"
                            name="mode_of_transport"
                            value={form.mode_of_transport}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Warranty Status *</label>

                            <select
                                name="warranty_status"
                                value={form.warranty_status}
                                onChange={handleChange}
                                required
                            >
                                <option value="ON WARRANTY">
                                    On warranty
                                </option>

                                <option value="NOT ON WARRANTY">
                                    Not on warranty
                                </option>
                            </select>
                        </div>



                        <FormField
                            label="Warranty Expiry Date"
                            name="warranty_end"
                            type="date"
                            value={form.warranty_end}
                            onChange={handleChange}
                            min={todayString}
                            required
                        />

                        <div className="form-field">
                            <label>
                                Asset Status *
                            </label>

                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                required
                            >
                                {/* Show Available only when the asset is NOT already assigned */}
                                {form.status !== "ASSIGNED" && (
                                    <option value="AVAILABLE">
                                        Available
                                    </option>
                                )}


                                <option value="LOST">
                                    Lost
                                </option>

                                <option value="RETIRED">
                                    Retired
                                </option>

                                {/* Keep Assigned visible when the asset is currently assigned */}
                                {form.status === "ASSIGNED" && (
                                    <option value="ASSIGNED">
                                        Assigned
                                    </option>
                                )}
                            </select>
                        </div>

                        <FormField
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            required
                        />

                        <div className="form-field">
                            <label>Description *</label>

                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows="3"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Remarks *</label>

                            <textarea
                                name="remarks"
                                value={form.remarks}
                                onChange={handleChange}
                                rows="3"
                                required
                            />
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
                                ? "Updating..."
                                : "Update Asset"}
                        </button>

                    </div>


                </form>

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
    min,
    max,
    placeholder
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
                min={min}
                max={max}
                placeholder={placeholder}
            />
        </div>
    );
}


function formatStatus(status) {

    return status
        .replaceAll("_", " ")
        .replace(
            /\w\S*/g,
            (word) =>
                word.charAt(0).toUpperCase()
                +
                word
                    .slice(1)
                    .toLowerCase()
        );
}


export default Assets;