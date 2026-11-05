import { useState } from "react";
import {
    Upload,
    Download,
    FileSpreadsheet,
    ArrowLeft,
    CheckCircle,
    AlertCircle
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../services/api";


function UploadAssets() {

    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);


    /*
     * ============================================================
     * DOWNLOAD TEMPLATE
     * ============================================================
     */

    const downloadTemplate = () => {

        const templateData = [
            {
                "Asset Tag": "",
                "Serial Number": "",
                "Item Type": "Laptop",
                "Brand": "",
                "Model": "",
                "Vendor Name": "",
                "Date of Arrived": "",
                "Processor": "",
                "RAM": "",
                "Storage": "",
                "Display": "",
                "OS": "",
                "Description": "",
                "Asset Status": "AVAILABLE",
                "Mode of Transport": "",
                "Warranty Status": "ON WARRANTY",
                "Warranty Expiry Date": "",
                "Department": "",
                "Rental Cost": "",
                "Location": "",
                "Remarks": ""
            }
        ];


        const worksheet =
            XLSX.utils.json_to_sheet(
                templateData
            );


        worksheet["!cols"] = [
            { wch: 20 }, // Asset Tag
            { wch: 22 }, // Serial Number
            { wch: 18 }, // Item Type
            { wch: 18 }, // Brand
            { wch: 20 }, // Model
            { wch: 25 }, // Vendor Name
            { wch: 20 }, // Date of Arrived
            { wch: 22 }, // Processor
            { wch: 12 }, // RAM
            { wch: 18 }, // Storage
            { wch: 18 }, // Display
            { wch: 20 }, // OS
            { wch: 35 }, // Description
            { wch: 18 }, // Asset Status
            { wch: 22 }, // Mode of Transport
            { wch: 22 }, // Warranty Status
            { wch: 22 }, // Warranty Expiry Date
            { wch: 20 }, // Department
            { wch: 15 }, // Rental Cost
            { wch: 20 }, // Location
            { wch: 35 }  // Remarks
        ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Assets"
        );


        XLSX.writeFile(
            workbook,
            "Asset_Upload_Template.xlsx"
        );
    };


    /*
     * ============================================================
     * FILE SELECTION
     * ============================================================
     */

    // ============================================================
    // FILE SELECTION
    // ============================================================

    const processSelectedFile = (selectedFile) => {
        setError("");
        setSuccess("");
        setUploadResult(null);

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const validExtensions = [
            ".xlsx",
            ".xls"
        ];

        const fileName =
            selectedFile.name.toLowerCase();

        const isValid =
            validExtensions.some(
                (extension) =>
                    fileName.endsWith(extension)
            );

        if (!isValid) {
            setError(
                "Please upload an Excel file (.xlsx or .xls)."
            );

            setFile(null);
            return;
        }

        setFile(selectedFile);
    };


    // ============================================================
    // FILE INPUT
    // ============================================================

    const handleFileChange = (event) => {
        const selectedFile =
            event.target.files?.[0];

        processSelectedFile(selectedFile);
    };


    // ============================================================
    // DRAG AND DROP
    // ============================================================

    const handleDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (uploading) {
            return;
        }

        setIsDragging(true);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (uploading) {
            return;
        }

        setIsDragging(true);

        // Required to allow dropping
        event.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (uploading) {
            return;
        }

        /*
         * Prevent flickering when moving between
         * children inside the drop zone.
         */
        if (
            event.currentTarget.contains(
                event.relatedTarget
            )
        ) {
            return;
        }

        setIsDragging(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();

        setIsDragging(false);

        if (uploading) {
            return;
        }

        const droppedFile =
            event.dataTransfer.files?.[0];

        processSelectedFile(droppedFile);
    };


    /*
     * ============================================================
     * UPLOAD
     * ============================================================
     */

    const handleUpload = async () => {

        if (!file) {

            setError(
                "Please select an Excel file first."
            );

            return;
        }

        setError("");
        setSuccess("");

        try {

            const formData = new FormData();

            formData.append(
                "file",
                file
            );

            const response = await api.post(
                "/assets/upload",
                formData
            );

            const data = response.data;

            if (!data.success) {

                setError(
                    data.message ||
                    "Failed to upload assets."
                );

                return;
            }

            const updatedCount =
                Number(
                    data.summary?.updated ??
                    data.summary?.added ??
                    data.updated_count ??
                    data.added_count ??
                    0
                );

            const skippedCount =
                Number(
                    data.summary?.skipped ??
                    data.skipped_count ??
                    0
                );

            const failedCount =
                Number(
                    data.summary?.failed ??
                    data.failed_count ??
                    0
                );

            setUploadResult({
                updated: updatedCount,
                skipped: skippedCount,
                failed: failedCount
            });

            setSuccess("Upload Complete");

            setUploadResult({
                updated: updatedCount,
                skipped: skippedCount,
                failed: failedCount
            });

            setSuccess("Upload Complete");

            /*
             * Clear selected file after successful upload
             */
            setFile(null);

            /*
             * Reset the file input so the same Excel file
             * can be selected again if required.
             */
            const input =
                document.getElementById(
                    "asset-excel-upload"
                );

            if (input) {
                input.value = "";
            }

        } catch (error) {

            console.error(
                "Asset Excel upload failed:",
                error
            );

            const message =
                error?.response?.data?.message ||
                "Failed to upload assets. Please try again.";

            setError(message);
        }
    };


    return (

        <div className="assets-page">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="page-header">

                <div>

                    <h1>
                        Upload Assets
                    </h1>

                    <p>
                        Import multiple assets using an Excel template.
                    </p>

                </div>


                <div className="page-header-actions">

                    <button
                        type="button"
                        className="download-excel-button"
                        onClick={downloadTemplate}
                    >
                        <Download size={17} />

                        Download Template
                    </button>


                    <button
                        type="button"
                        className="add-button"
                        onClick={() =>
                            navigate("/assets")
                        }
                    >
                        <ArrowLeft size={17} />

                        Back to Assets
                    </button>

                </div>

            </div>


            {/* ====================================================
                UPLOAD CARD
            ==================================================== */}

            <div className="dashboard-panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Import Assets
                        </h2>

                        <p>
                            Download the template, fill in the asset
                            details, and upload the completed Excel file.
                        </p>

                    </div>

                </div>


                <div
                    className={`asset-upload-drop-zone ${isDragging
                            ? "asset-upload-drop-zone-active"
                            : ""
                        } ${uploading
                            ? "asset-upload-drop-zone-disabled"
                            : ""
                        }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >

                    <div className="asset-upload-drop-icon">
                        <FileSpreadsheet size={52} />
                    </div>

                    <h3>
                        Upload Excel File
                    </h3>

                    <p className="asset-upload-drop-description">
                        Drag and drop your Excel file here
                    </p>

                    <span className="asset-upload-drop-or">
                        or
                    </span>

                    <label
                        htmlFor="asset-excel-upload"
                        className="asset-upload-choose-button"
                    >
                        <Upload size={18} />
                        Choose Excel File
                    </label>

                    <input
                        id="asset-excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{
                            display: "none"
                        }}
                    />

                    <p className="asset-upload-file-types">
                        Only .xlsx and .xls files are supported.
                    </p>

                    {file && (
                        <div className="asset-upload-selected-file">

                            <FileSpreadsheet size={18} />

                            <div>
                                <span>
                                    Selected file
                                </span>

                                <strong>
                                    {file.name}
                                </strong>
                            </div>

                        </div>
                    )}




                    {error && (

                        <div
                            style={{
                                marginTop: "20px",
                                padding: "12px",
                                borderRadius: "8px"
                            }}
                        >

                            <AlertCircle
                                size={18}
                                style={{
                                    verticalAlign: "middle",
                                    marginRight: "6px"
                                }}
                            />

                            {error}

                        </div>

                    )}


                    {success && uploadResult && (
                        <div
                            className="asset-upload-success"
                        >
                            <div className="asset-upload-success-icon">
                                <CheckCircle size={22} />
                            </div>

                            <div className="asset-upload-success-content">

                                <strong>
                                    Upload Complete
                                </strong>

                                <span>
                                    {uploadResult.updated}{" "}
                                    {uploadResult.updated === 1
                                        ? "asset"
                                        : "assets"}{" "}
                                    updated successfully.
                                </span>

                                {(uploadResult.skipped > 0 ||
                                    uploadResult.failed > 0) && (
                                        <small>
                                            {uploadResult.skipped > 0 &&
                                                `${uploadResult.skipped} skipped`}

                                            {uploadResult.skipped > 0 &&
                                                uploadResult.failed > 0 &&
                                                " • "}

                                            {uploadResult.failed > 0 &&
                                                `${uploadResult.failed} failed`}
                                        </small>
                                    )}

                            </div>
                        </div>
                    )}


                    <div
                        style={{
                            marginTop: "30px"
                        }}
                    >

                        <button
                            type="button"
                            className="add-button"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            <Upload size={17} />

                            {uploading
                                ? "Uploading..."
                                : "Upload Assets"
                            }
                        </button>

                    </div>

                </div>

            </div>


            {/* ====================================================
                TEMPLATE INFORMATION
            ==================================================== */}

            <div
                className="dashboard-panel"
                style={{
                    marginTop: "20px"
                }}
            >

                <div className="panel-header">

                    <div>

                        <h2>
                            Excel Format
                        </h2>

                        <p>
                            Use the exact column names provided in the template.
                        </p>

                    </div>

                </div>


                <div
                    style={{
                        padding: "20px",
                        overflowX: "auto"
                    }}
                >

                    <table className="assets-table">

                        <thead>

                            <tr>

                                <th>Column</th>
                                <th>Required</th>

                            </tr>

                        </thead>


                        <tbody>

                            <tr>
                                <td>Asset Tag</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Serial Number</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Item Type</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Brand</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Model</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Vendor Name</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Date of Arrived</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Processor</td>
                                <td>No</td>
                            </tr>

                            <tr>
                                <td>RAM</td>
                                <td>No</td>
                            </tr>

                            <tr>
                                <td>Storage</td>
                                <td>No</td>
                            </tr>

                            <tr>
                                <td>Display</td>
                                <td>No</td>
                            </tr>

                            <tr>
                                <td>OS</td>
                                <td>No</td>
                            </tr>

                            <tr>
                                <td>Description</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Asset Status</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Mode of Transport</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Warranty Status</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Warranty Expiry Date</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Department</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Rental Cost</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Location</td>
                                <td>Yes</td>
                            </tr>

                            <tr>
                                <td>Remarks</td>
                                <td>Yes</td>
                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}


export default UploadAssets;