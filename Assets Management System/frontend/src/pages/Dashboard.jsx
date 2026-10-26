import { useEffect, useState } from "react";
import {
    Package,
    CheckCircle,
    UserCheck,
    Wrench,
    Users,
    AlertTriangle,
    Building2,
    ClipboardList,
    FileSpreadsheet,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import api from "../services/api";


function Dashboard() {
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        total_assets: 0,
        available_assets: 0,
        assigned_assets: 0,
        repair_assets: 0,
        lost_assets: 0,
        retired_assets: 0,
        total_employees: 0,
        pending_requests: 0,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get(
                    "/dashboard/stats"
                );

                setStats(response.data);
            } catch (error) {
                console.error(
                    "Dashboard error:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        {
            title: "Total Assets",
            value: stats.total_assets,
            icon: Package,
        },
        {
            title: "Available",
            value: stats.available_assets,
            icon: CheckCircle,
        },
        {
            title: "Assigned",
            value: stats.assigned_assets,
            icon: UserCheck,
        },
        {
            title: "Under Repair",
            value: stats.repair_assets,
            icon: Wrench,
        },
        {
            title: "Lost",
            value: stats.lost_assets,
            icon: AlertTriangle,
        },
        {
            title: "Employees",
            value: stats.total_employees,
            icon: Users,
        },
        {
            title: "Pending Requests",
            value: stats.pending_requests,
            icon: ClipboardList,
        },
    ];

    const downloadExcel = async () => {
        try {
            const XLSX = await import("xlsx");

            /*
             * =====================================================
             * FETCH ALL DATA
             * =====================================================
             */

            const [
                assetsResponse,
                employeesResponse,
                vendorsResponse,
                assignmentsResponse
            ] = await Promise.all([
                api.get("/assets", {
                    timeout: 15000
                }),

                api.get("/employees", {
                    timeout: 15000
                }),

                api.get("/vendors", {
                    timeout: 15000
                }),

                api.get("/assignments", {
                    timeout: 15000
                })
            ]);


            /*
             * =====================================================
             * GET DATA ARRAYS
             * =====================================================
             */

            const allAssets =
                Array.isArray(assetsResponse.data)
                    ? assetsResponse.data
                    : [];

            const allEmployees =
                Array.isArray(employeesResponse.data)
                    ? employeesResponse.data
                    : [];

            const allVendors =
                Array.isArray(vendorsResponse.data)
                    ? vendorsResponse.data
                    : [];

            const allAssignments =
                Array.isArray(assignmentsResponse.data)
                    ? assignmentsResponse.data
                    : [];


            /*
             * =====================================================
             * COMMON DATE FORMAT
             * =====================================================
             */

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


            /*
             * =====================================================
             * ASSET STATUS FORMAT
             * =====================================================
             */

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
             * =====================================================
             * ASSETS
             * EXACT SAME COLUMNS AS ASSETS PAGE
             * =====================================================
             */

            const assetData = allAssets.map((asset) => ({

                "Asset Register":
                    asset.id || "",

                "Vendor Name":
                    asset.vendor_name || "",

                "Asset Tag":
                    asset.asset_tag || "",

                "Serial number":
                    asset.serial_number || "",

                "Item Type":
                    asset.asset_type || "",

                "Brand":
                    asset.brand || "",

                "Model":
                    asset.model || "",

                "Date of arrived":
                    formatDate(
                        asset.received_date
                    ),

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

                "Processor":
                    asset.processor || "",

                "RAM":
                    asset.ram || "",

                "Storage":
                    asset.storage || "",

                "Display":
                    asset.display || "",

                "Description":
                    asset.description || "",

                "OS":
                    asset.operating_system || "",

                "Asset status":
                    formatStatus(
                        asset.status
                    ),

                "Mode of Transport":
                    asset.mode_of_transport || "",

                "Warranty Status":
                    asset.warranty_status || "",

                "Warranty Expiry Date":
                    formatDate(
                        asset.warranty_end
                    ),

                "Department":
                    asset.department || "",

                "Rental Cost":
                    asset.rental_cost ?? "",

                "Location":
                    asset.location || "",

                "Remarks":
                    asset.remarks || ""
            }));


            /*
             * =====================================================
             * ASSET WORKSHEET
             * =====================================================
             */

            const assetWorksheet =
                XLSX.utils.json_to_sheet(
                    assetData
                );


            /*
             * EXACT SAME COLUMN WIDTHS
             */

            assetWorksheet["!cols"] = [

                { wch: 15 },
                { wch: 25 },
                { wch: 18 },
                { wch: 22 },
                { wch: 18 },
                { wch: 18 },
                { wch: 20 },
                { wch: 18 },
                { wch: 30 },
                { wch: 22 },
                { wch: 12 },
                { wch: 18 },
                { wch: 18 },
                { wch: 35 },
                { wch: 20 },
                { wch: 18 },
                { wch: 22 },
                { wch: 22 },
                { wch: 22 },
                { wch: 20 },
                { wch: 15 },
                { wch: 20 },
                { wch: 35 }

            ];


            /*
             * =====================================================
             * EMPLOYEES
             * =====================================================
             */

            const employeeData =
                allEmployees.map((employee) => ({

                    "Employee ID":
                        employee.employee_id || "",

                    "Name":
                        employee.name ||
                        employee.full_name ||
                        "",

                    "Email":
                        employee.email || "",

                    "Phone Number":
                        employee.phone || "",

                    "Department":
                        employee.department || "",

                    "Designation":
                        employee.designation || "",

                    "Cost Center":
                        employee.cost_center || "",

                    "Joining Date":
                        formatDate(
                            employee.joining_date
                        )
                }));


            const employeeWorksheet =
                XLSX.utils.json_to_sheet(
                    employeeData
                );


            employeeWorksheet["!cols"] = [

                { wch: 18 },
                { wch: 28 },
                { wch: 35 },
                { wch: 18 },
                { wch: 22 },
                { wch: 25 },
                { wch: 18 },
                { wch: 18 }

            ];


            /*
             * =====================================================
             * VENDORS
             * =====================================================
             */

            const vendorData =
                allVendors.map((vendor) => ({

                    "Vendor Name":
                        vendor.vendor_name ||
                        vendor.name ||
                        "",

                    "Contact Person":
                        vendor.contact_person || "",

                    "Email":
                        vendor.email || "",

                    "Phone Number":
                        vendor.phone || "",

                    "Address":
                        vendor.address || ""

                }));


            const vendorWorksheet =
                XLSX.utils.json_to_sheet(
                    vendorData
                );


            vendorWorksheet["!cols"] = [

                { wch: 30 },
                { wch: 25 },
                { wch: 35 },
                { wch: 18 },
                { wch: 45 }

            ];


            /*
             * =====================================================
             * ASSIGNMENTS
             * =====================================================
             */

            const assignmentData =
                allAssignments.map((assignment) => ({

                    "Assignment ID":
                        assignment.id || "",

                    "Asset ID":
                        assignment.asset_id || "",

                    "Asset Tag":
                        assignment.asset_tag || "",

                    "Asset Type":
                        assignment.asset_type || "",

                    "Employee ID":
                        assignment.employee_id ||
                        "",

                    "Employee Name":
                        assignment.employee_name ||
                        "",

                    "Employee Email":
                        assignment.employee_email ||
                        "",

                    "Issue Date":
                        formatDate(
                            assignment.issue_date
                        ),

                    "Expected Return Date":
                        formatDate(
                            assignment.expected_return_date
                        ),

                    "Actual Return Date":
                        formatDate(
                            assignment.actual_return_date
                        ),

                    "Issued By":
                        assignment.issued_by ||
                        "",

                    "Returned To":
                        assignment.returned_to ||
                        "",

                    "Condition At Issue":
                        assignment.condition_at_issue ||
                        "",

                    "Condition At Return":
                        assignment.condition_at_return ||
                        "",

                    "Remarks":
                        assignment.remarks ||
                        "",

                    "Status":
                        assignment.status ||
                        "",

                    "Created At":
                        formatDate(
                            assignment.created_at
                        )
                }));


            const assignmentWorksheet =
                XLSX.utils.json_to_sheet(
                    assignmentData
                );


            assignmentWorksheet["!cols"] = [

                { wch: 18 },
                { wch: 15 },
                { wch: 18 },
                { wch: 18 },
                { wch: 18 },
                { wch: 28 },
                { wch: 35 },
                { wch: 18 },
                { wch: 22 },
                { wch: 20 },
                { wch: 22 },
                { wch: 22 },
                { wch: 24 },
                { wch: 24 },
                { wch: 35 },
                { wch: 18 },
                { wch: 22 }

            ];


            /*
             * =====================================================
             * CREATE WORKBOOK
             * =====================================================
             */

            const workbook =
                XLSX.utils.book_new();


            /*
             * IMPORTANT:
             * SHEET ORDER
             *
             * 1. Asset Register
             * 2. Employees
             * 3. Vendors
             * 4. Assignments
             */

            XLSX.utils.book_append_sheet(
                workbook,
                assetWorksheet,
                "Asset Register"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                employeeWorksheet,
                "Employees"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                vendorWorksheet,
                "Vendors"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                assignmentWorksheet,
                "Assignments"
            );


            /*
             * =====================================================
             * FILE NAME
             * =====================================================
             */

            const today =
                new Date();

            const dateString =
                `${today.getFullYear()}-${String(
                    today.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    today.getDate()
                ).padStart(2, "0")}`;


            /*
             * =====================================================
             * DOWNLOAD
             * =====================================================
             */

            XLSX.writeFile(
                workbook,
                `Abylle_Asset_Management_${dateString}.xlsx`
            );

        } catch (error) {

            console.error(
                "Failed to export dashboard:",
                error
            );

            alert(
                "Failed to download Excel report."
            );
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="dashboard">

            {/* HEADER */}
            <div className="page-header">

                <div>
                    <h1>Dashboard</h1>

                    <p>
                        Overview of your IT assets and assignments
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <button
                        className="download-excel-button"
                        onClick={downloadExcel}
                    >
                        <FileSpreadsheet size={19} />
                        Download Excel
                    </button>

                    <button
                        className="add-button"
                        onClick={() =>
                            navigate("/assets")
                        }
                    >
                        + Add Asset
                    </button>

                </div>

            </div>


            {/* STAT CARDS */}
            <div className="stats-grid">

                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            className="stat-card"
                            key={card.title}
                        >

                            <div className="stat-card-top">

                                <div className="stat-icon">
                                    <Icon size={22} />
                                </div>

                            </div>

                            <p>
                                {card.title}
                            </p>

                            <h2>
                                {card.value}
                            </h2>

                        </div>
                    );
                })}

            </div>


            {/* DASHBOARD PANELS */}
            <div className="dashboard-grid">

                {/* ASSET STATUS */}
                <div className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Asset Status
                            </h2>

                            <p>
                                Current distribution of assets
                            </p>
                        </div>

                    </div>

                    <div className="status-list">

                        <StatusRow
                            label="Available"
                            value={stats.available_assets}
                        />

                        <StatusRow
                            label="Assigned"
                            value={stats.assigned_assets}
                        />

                        <StatusRow
                            label="Under Repair"
                            value={stats.repair_assets}
                        />

                        <StatusRow
                            label="Lost"
                            value={stats.lost_assets}
                        />

                    </div>

                </div>


                {/* QUICK ACTIONS */}
                <div className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Quick Actions
                            </h2>

                            <p>
                                Common asset management tasks
                            </p>
                        </div>

                    </div>


                    <div className="quick-actions">

                        {/* ADD ASSET */}
                        <button
                            onClick={() =>
                                navigate("/assets")
                            }
                        >
                            <Package size={19} />
                            Add New Asset
                        </button>


                        {/* ASSIGN ASSET */}
                        <button
                            onClick={() =>
                                navigate("/assignments")
                            }
                        >
                            <UserCheck size={19} />
                            Assign Asset
                        </button>


                        {/* ADD EMPLOYEE */}
                        <button
                            onClick={() =>
                                navigate("/employees")
                            }
                        >
                            <Users size={19} />
                            Add Employee
                        </button>


                        {/* ADD VENDOR */}
                        <button
                            onClick={() =>
                                navigate("/vendors")
                            }
                        >
                            <Building2 size={19} />
                            Add Vendor
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}


function StatusRow({
    label,
    value
}) {
    return (
        <div className="status-row">

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


export default Dashboard;