import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Building2,
    Mail,
    Phone,
    MapPin,
    User,
    Pencil,
    Trash2,
    Download,
} from "lucide-react";

import * as XLSX from "xlsx";

import api from "../services/api";

function Vendors() {

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);

    const [editingVendor, setEditingVendor] = useState(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const [form, setForm] = useState({
        vendor_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
    });


    /* ================================
       FETCH VENDORS
    ================================= */

    const fetchVendors = async () => {

        try {

            setLoading(true);

            const response = await api.get("/vendors");

            setVendors(response.data);

        } catch (error) {

            console.error(
                "Vendor fetch error:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        fetchVendors();

    }, []);


    /* ================================
       FORM CHANGE
    ================================= */

    const handleChange = (event) => {

        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };


    /* ================================
       OPEN MODAL
    ================================= */

    const openModal = () => {
        setEditingVendor(null);

        setForm({
            vendor_name: "",
            contact_person: "",
            email: "",
            phone: "",
            address: "",
        });

        setShowModal(true);
    };


    const openEditModal = (vendor) => {

        setEditingVendor(vendor);

        setForm({
            vendor_name: vendor.vendor_name || "",
            contact_person: vendor.contact_person || "",
            email: vendor.email || "",
            phone: vendor.phone || "",
            address: vendor.address || "",
        });

        setShowModal(true);
    };

    /* ================================
       CREATE VENDOR
    ================================= */

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {

            if (editingVendor) {

                await api.put(
                    `/vendors/${editingVendor.id}`,
                    form
                );

            } else {

                await api.post(
                    "/vendors",
                    form
                );
            }

            setShowModal(false);
            setEditingVendor(null);

            setForm({
                vendor_name: "",
                contact_person: "",
                email: "",
                phone: "",
                address: "",
            });

            await fetchVendors();

        } catch (error) {

            console.error(
                "Vendor save error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to save vendor."
            );
        }
    };


    const handleDelete = (vendor) => {
        setVendorToDelete(vendor);
        setShowDeleteModal(true);
    };


    const confirmDeleteVendor = async () => {
        if (!vendorToDelete || deleting) return;

        try {
            setDeleting(true);
            setDeleteError("");

            await api.delete(`/vendors/${vendorToDelete.id}`);

            setShowDeleteModal(false);
            setVendorToDelete(null);

            await fetchVendors();
        } catch (error) {
            console.error("Vendor deletion error:", error);

            setDeleteError(
                error.response?.data?.message ||
                "Unable to delete vendor. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    };




    /* ================================
       SEARCH
    ================================= */

    const filteredVendors =
        vendors.filter((vendor) => {

            const searchText =
                search.toLowerCase();

            return (
                vendor.vendor_name
                    ?.toLowerCase()
                    .includes(searchText) ||

                vendor.contact_person
                    ?.toLowerCase()
                    .includes(searchText) ||

                vendor.email
                    ?.toLowerCase()
                    .includes(searchText) ||

                vendor.phone
                    ?.toLowerCase()
                    .includes(searchText)
            );
        });

    const handleDownloadExcel = () => {
        if (!vendors || vendors.length === 0) {
            alert("No vendors available to download.");
            return;
        }

        const excelData = vendors.map((vendor) => ({
            "Vendor ID": vendor.id || "",
            "Vendor Name": vendor.vendor_name || "",
            "Contact Person": vendor.contact_person || "",
            "Email": vendor.email || "",
            "Phone Number": vendor.phone || "",
            "Address": vendor.address || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(
            excelData
        );

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Vendors"
        );

        XLSX.writeFile(
            workbook,
            "Vendors.xlsx"
        );
    };


    return (

        <div className="vendors-page">


            {/* HEADER */}

            <div className="page-header">

                <div>

                    <h1>
                        Vendors
                    </h1>

                    <p>
                        Manage IT asset vendors and suppliers
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
                        onClick={openModal}
                        type="button"
                    >
                        <Plus size={18} />
                        Add Vendor
                    </button>

                </div>

            </div>


            {/* SEARCH */}

            <div className="vendors-toolbar">

                <div className="search-box">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                </div>

            </div>


            {/* VENDORS */}

            <div className="vendors-container">

                {loading ? (

                    <div className="table-message">
                        Loading vendors...
                    </div>

                ) : filteredVendors.length === 0 ? (

                    <div className="empty-vendors">

                        <Building2 size={44} />

                        <h3>
                            No vendors found
                        </h3>

                        <p>
                            Add your first vendor to
                            start managing suppliers.
                        </p>

                        <button
                            className="add-button"
                            onClick={openModal}
                        >
                            <Plus size={17} />
                            Add Vendor
                        </button>

                    </div>

                ) : (

                    <div className="vendor-grid">

                        {filteredVendors.map(
                            (vendor) => (

                                <div
                                    className="vendor-card"
                                    key={vendor.id}
                                >

                                    <div className="vendor-card-header">

                                        <div className="vendor-card-title">

                                            <div className="vendor-icon">
                                                <Building2 size={21} />
                                            </div>

                                            <div>
                                                <h3>
                                                    {vendor.vendor_name}
                                                </h3>

                                                <span>
                                                    Vendor #{vendor.id}
                                                </span>
                                            </div>

                                        </div>

                                        <div className="vendor-actions">

                                            <button
                                                type="button"
                                                className="vendor-action-button edit"
                                                onClick={() => openEditModal(vendor)}
                                                title="Edit vendor"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className="vendor-action-button delete"
                                                onClick={() => handleDelete(vendor)}
                                                title="Delete vendor"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                        </div>

                                    </div>


                                    <div className="vendor-details">


                                        {vendor.contact_person && (

                                            <div className="vendor-detail">

                                                <User size={16} />

                                                <span>
                                                    {
                                                        vendor.contact_person
                                                    }
                                                </span>

                                            </div>

                                        )}


                                        {vendor.email && (

                                            <div className="vendor-detail">

                                                <Mail size={16} />

                                                <span>
                                                    {
                                                        vendor.email
                                                    }
                                                </span>

                                            </div>

                                        )}


                                        {vendor.phone && (

                                            <div className="vendor-detail">

                                                <Phone size={16} />

                                                <span>
                                                    {
                                                        vendor.phone
                                                    }
                                                </span>

                                            </div>

                                        )}


                                        {vendor.address && (

                                            <div className="vendor-detail">

                                                <MapPin size={16} />

                                                <span>
                                                    {
                                                        vendor.address
                                                    }
                                                </span>

                                            </div>

                                        )}

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>


            {/* ADD VENDOR MODAL */}

            {showModal && (

                <div className="vendor-modal-overlay">

                    <div className="vendor-modal">


                        <div className="vendor-modal-header">

                            <div>

                                <h2>
                                    {editingVendor ? "Edit Vendor" : "Add Vendor"}
                                </h2>

                                <p>
                                    {editingVendor
                                        ? "Update vendor information"
                                        : "Add a new IT asset supplier"
                                    }
                                </p>

                            </div>


                            <button
                                className="vendor-modal-close"
                                onClick={() =>
                                    setShowModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                        >


                            <div className="vendor-form-grid">


                                <VendorInput
                                    label="Vendor Name *"
                                    name="vendor_name"
                                    value={
                                        form.vendor_name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Dell Technologies"
                                    required
                                />


                                <VendorInput
                                    label="Contact Person"
                                    name="contact_person"
                                    value={
                                        form.contact_person
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. John Smith"
                                />


                                <VendorInput
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={
                                        form.email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="vendor@example.com"
                                />


                                <VendorInput
                                    label="Phone"
                                    name="phone"
                                    value={
                                        form.phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="+91 XXXXX XXXXX"
                                />

                            </div>


                            <div className="vendor-form-field">

                                <label>
                                    Address
                                </label>

                                <textarea
                                    name="address"
                                    value={
                                        form.address
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Vendor address"
                                    rows="3"
                                />

                            </div>


                            <div className="vendor-modal-footer">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="add-button"
                                >
                                    {editingVendor ? (
                                        <>
                                            <Pencil size={17} />
                                            Update Vendor
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={17} />
                                            Add Vendor
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {showDeleteModal && (
                <div
                    className="delete-confirm-overlay"
                    onClick={() => {
                        if (!deleting) {
                            setShowDeleteModal(false);
                            setVendorToDelete(null);
                        }
                    }}
                >
                    <div
                        className="delete-confirm-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-vendor-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="delete-confirm-close"
                            aria-label="Close confirmation"
                            disabled={deleting}
                            onClick={() => {
                                setShowDeleteModal(false);
                                setVendorToDelete(null);
                            }}
                        >
                            ×
                        </button>

                        <div className="delete-confirm-icon">
                            <Trash2 size={24} />
                        </div>

                        <h2 id="delete-vendor-title">
                            Delete Vendor?
                        </h2>

                        <p>
                            Are you sure you want to delete{" "}
                            <strong>
                                {vendorToDelete?.vendor_name}
                            </strong>
                            ? This action cannot be undone.
                        </p>

                        <div className="delete-confirm-actions">
                            <button
                                type="button"
                                className="delete-confirm-cancel"
                                disabled={deleting}
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setVendorToDelete(null);
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-submit"
                                disabled={deleting}
                                onClick={confirmDeleteVendor}
                            >
                                <Trash2 size={16} />
                                {deleting ? "Deleting..." : "Delete Vendor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {deleteError && (
                <div
                    className="delete-error-overlay"
                    onClick={() => setDeleteError("")}
                >
                    <div
                        className="delete-error-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-error-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="delete-error-close"
                            aria-label="Close error"
                            onClick={() => setDeleteError("")}
                        >
                            ×
                        </button>

                        <div className="delete-error-icon">
                            <Trash2 size={24} />
                        </div>

                        <h2 id="delete-error-title">
                            Cannot Delete Vendor
                        </h2>

                        <p>{deleteError}</p>

                        <div className="delete-error-actions">
                            <button
                                type="button"
                                className="delete-error-ok"
                                onClick={() => setDeleteError("")}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
}


/* ================================
   INPUT COMPONENT
================================= */

function VendorInput({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
}) {

    return (

        <div className="vendor-form-field">

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


export default Vendors;