import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Employees from "./pages/Employees";
import Assignments from "./pages/Assignments";
import Vendors from "./pages/Vendors";
import AssetHistory from "./pages/AssetHistory";
import UserManagement from "./pages/UserManagement";
import AssetRequests from "./pages/AssetRequests";
import AuditLogs from "./pages/AuditLogs";
import Maintenance from "./pages/Maintenance";
import QrAudits from "./pages/QrAudits";
import ITSupport from "./pages/ITSupport";
import UploadAssets from "./pages/UploadAssets";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";

import EmployeeLayout from "./layouts/EmployeeLayout";

import {
  AuthProvider,
  useAuth
} from "./context/AuthContext";

import api from "./services/api";



/* ================================================================
   ADMIN / IT / SUPERUSER LAYOUT
================================================================ */

function AppLayout() {

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [showReturnReminder, setShowReturnReminder] =
    useState(false);

  const [upcomingReturns, setUpcomingReturns] =
    useState([]);


  useEffect(() => {

    let mounted = true;

    const checkUpcomingReturns = async () => {

      try {

        const response = await api.get("/assignments");

        const assignments = response.data || [];

        const today = new Date();

        const dateString = (date) => [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0")
        ].join("-");

        const todayString = dateString(today);

        const sevenDaysLater = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 7
        );

        const endDateString = dateString(sevenDaysLater);

        const dueAssignments = assignments
          .filter((assignment) => (
            assignment.status === "ACTIVE" &&
            assignment.expected_return_date &&
            assignment.expected_return_date >= todayString &&
            assignment.expected_return_date <= endDateString
          ))
          .sort((a, b) =>
            a.expected_return_date.localeCompare(
              b.expected_return_date
            )
          );

        if (mounted && dueAssignments.length > 0) {
          setUpcomingReturns(dueAssignments);
          setShowReturnReminder(true);
        }

      } catch (error) {

        console.error(
          "Unable to check upcoming asset returns:",
          error
        );

      }

    };

    checkUpcomingReturns();

    return () => {
      mounted = false;
    };

  }, []);


  const formatReminderDate = (dateString) => {

    if (!dateString) return "-";

    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  };

  const [renewalReminders, setRenewalReminders] =
    useState([]);

  const [showRenewalReminder, setShowRenewalReminder] =
    useState(false);


  // Check vendor renewal dates once when the user logs in.
  useEffect(() => {

    let isMounted = true;

    const checkVendorRenewals = async () => {

      try {

        const response = await api.get("/vendors");

        const vendors = response.data || [];

        // Use local dates to avoid timezone-related date shifts.
        const today = new Date();

        const todayString = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0")
        ].join("-");

        // Calculate one calendar month from today.
        const nextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          today.getDate()
        );

        // Handle month-end dates such as January 31.
        if (
          nextMonth.getDate() !== today.getDate()
        ) {
          nextMonth.setDate(0);
        }

        const nextMonthString = [
          nextMonth.getFullYear(),
          String(nextMonth.getMonth() + 1).padStart(2, "0"),
          String(nextMonth.getDate()).padStart(2, "0")
        ].join("-");


        const upcomingRenewals = vendors
          .filter((vendor) => {

            const renewalDate = vendor.renewal_date;

            return (
              renewalDate &&
              renewalDate >= todayString &&
              renewalDate <= nextMonthString
            );

          })
          .sort((a, b) =>
            a.renewal_date.localeCompare(b.renewal_date)
          );


        if (isMounted && upcomingRenewals.length > 0) {

          setRenewalReminders(upcomingRenewals);

          setShowRenewalReminder(true);

        }

      } catch (error) {

        console.error(
          "Unable to check vendor renewal dates:",
          error
        );

      }

    };


    checkVendorRenewals();


    return () => {
      isMounted = false;
    };

  }, []);


  const closeRenewalReminder = () => {
    setShowRenewalReminder(false);
  };


  const formatRenewalDate = (dateString) => {

    if (!dateString) return "Not specified";

    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  };


  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };


  return (

    <div className="app-layout">


      {/* =====================================================
                ADMIN SIDEBAR
            ===================================================== */}

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />


      {/* =====================================================
                MAIN AREA
            ===================================================== */}

      <div className="main-area">

        <Navbar
          onMenuClick={() =>
            setMobileMenuOpen(
              (prev) => !prev
            )
          }
        />


        <main className="content">

          <Routes>


            {/* =================================================
                            ADMIN DASHBOARD
                        ================================================= */}

            <Route
              path="/"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            ASSETS
                        ================================================= */}

            <Route
              path="/assets"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <Assets />
                </ProtectedRoute>
              }
            />

            <Route
              path="/assets/upload"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <UploadAssets />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            EMPLOYEES
                        ================================================= */}

            <Route
              path="/employees"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <Employees />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            ASSIGNMENTS
                        ================================================= */}

            <Route
              path="/assignments"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <Assignments />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            ASSET REQUESTS

                            Admin / IT / Superuser
                        ================================================= */}

            <Route
              path="/requests"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <AssetRequests />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            MAINTENANCE MANAGEMENT
                        ================================================= */}

            <Route
              path="/maintenance"
              element={
                <ProtectedRoute allowedRoles={["SUPERUSER", "ADMIN", "IT"]}>
                  <Maintenance />
                </ProtectedRoute>
              }
            />

            {/* =================================================
                            QR TRACKING & PHYSICAL AUDITS
                        ================================================= */}
            <Route
              path="/qr-audits"
              element={
                <ProtectedRoute allowedRoles={["SUPERUSER", "ADMIN", "IT"]}>
                  <QrAudits />
                </ProtectedRoute>
              }
            />

            <Route path="/it-support" element={<ProtectedRoute allowedRoles={["SUPERUSER", "ADMIN", "IT"]}><ITSupport /></ProtectedRoute>} />

            {/* =================================================
                            VENDORS
                        ================================================= */}

            <Route
              path="/vendors"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <Vendors />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            ASSET HISTORY
                        ================================================= */}

            <Route
              path="/asset-history"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN",
                    "IT"
                  ]}
                >
                  <AssetHistory />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            AUDIT LOGS — ADMIN / SUPERUSER ONLY
                        ================================================= */}

            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["SUPERUSER", "ADMIN"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            USER MANAGEMENT

                            ADMIN + SUPERUSER ONLY
                        ================================================= */}

            <Route
              path="/users"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "SUPERUSER",
                    "ADMIN"
                  ]}
                >
                  <UserManagement />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                            ADMIN FALLBACK
                        ================================================= */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

        </main>

      </div>
      {/* VENDOR RENEWAL REMINDER */}

      {showRenewalReminder && (

        <div
          className="renewal-reminder-overlay"
          onClick={closeRenewalReminder}
        >

          <div
            className="renewal-reminder-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="renewal-reminder-header">

              <div className="renewal-reminder-icon">
                <span>!</span>
              </div>

              <div className="renewal-reminder-heading">

                <h2>Vendor Renewal Reminder</h2>

                <p>
                  {renewalReminders.length} vendor
                  {renewalReminders.length > 1 ? "s have" : " has"}
                  {" "}a renewal due within one month.
                </p>

              </div>

              <button
                type="button"
                className="renewal-reminder-close"
                onClick={closeRenewalReminder}
                aria-label="Close reminder"
              >
                ×
              </button>

            </div>


            <div className="renewal-reminder-body">

              <p className="renewal-reminder-description">
                Please review the following vendor agreements
                and arrange renewals before their due dates.
              </p>


              <div className="renewal-reminder-list">

                {renewalReminders.map((vendor) => (

                  <div
                    className="renewal-reminder-item"
                    key={vendor.id}
                  >

                    <div className="renewal-vendor-info">

                      <strong>
                        {vendor.vendor_name}
                      </strong>

                      <span>
                        {vendor.contact_person || "Contact person not specified"}
                      </span>

                      {vendor.email && (
                        <span>{vendor.email}</span>
                      )}

                    </div>


                    <div className="renewal-vendor-date">

                      <span>Renewal Date</span>

                      <strong>
                        {formatRenewalDate(vendor.renewal_date)}
                      </strong>

                    </div>

                  </div>

                ))}

              </div>

            </div>


            <div className="renewal-reminder-footer">

              <span>
                Please take the necessary action.
              </span>

              <button
                type="button"
                onClick={closeRenewalReminder}
              >
                Got it
              </button>

            </div>

          </div>

        </div>

      )}

      {showReturnReminder && (

        <div
          className="return-reminder-overlay"
          onClick={() => setShowReturnReminder(false)}
        >

          <div
            className="return-reminder-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="return-reminder-header">

              <div className="return-reminder-icon">
                !
              </div>

              <div className="return-reminder-title">

                <h2>Asset Return Reminder</h2>

                <p>
                  {upcomingReturns.length} active assignment
                  {upcomingReturns.length !== 1 ? "s are" : " is"}
                  {" "}due within the next 7 days.
                </p>

              </div>

              <button
                type="button"
                className="return-reminder-close"
                onClick={() => setShowReturnReminder(false)}
              >
                ×
              </button>

            </div>


            <div className="return-reminder-body">

              <p className="return-reminder-description">
                The following assets are approaching their
                expected return dates. Please follow up with
                the respective employees.
              </p>


              <div className="return-reminder-list">

                {upcomingReturns.map((assignment) => (

                  <div
                    className="return-reminder-item"
                    key={assignment.id}
                  >

                    <div className="return-reminder-asset">

                      <strong>
                        {assignment.asset_tag || "Asset"}
                      </strong>

                      <span>
                        {assignment.asset_type || ""}
                      </span>

                      <span>
                        {assignment.employee_name || "Employee not available"}
                      </span>

                      <span>
                        Employee ID: {assignment.employee_code || "-"}
                      </span>

                    </div>


                    <div className="return-reminder-date">

                      <span>Expected Return</span>

                      <strong>
                        {formatReminderDate(
                          assignment.expected_return_date
                        )}
                      </strong>

                    </div>

                  </div>

                ))}

              </div>

            </div>


            <div className="return-reminder-footer">

              <span>
                Please arrange the asset returns on time.
              </span>

              <button
                type="button"
                onClick={() => setShowReturnReminder(false)}
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



/* ================================================================
   AUTHENTICATED APPLICATION
================================================================ */

function AuthenticatedApp() {

  const {
    isAuthenticated,
    user
  } = useAuth();



  /* ============================================================
     NOT LOGGED IN
  ============================================================ */

  if (!isAuthenticated) {

    return (

      <Routes>

        {/* LOGIN */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />


        {/* FORGOT PASSWORD */}

        <Route
          path="/forgot-password"
          element={
            <ForgotPassword />
          }
        />


        {/* FALLBACK */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    );
  }



  /* ============================================================
     TEMPORARY PASSWORD

     The user MUST change their temporary
     password before accessing the application.
  ============================================================ */

  if (user?.must_change_password) {

    return (

      <Routes>

        <Route
          path="/change-password"
          element={
            <ChangePassword />
          }
        />


        <Route
          path="*"
          element={
            <Navigate
              to="/change-password"
              replace
            />
          }
        />

      </Routes>
    );
  }



  /* ============================================================
     EMPLOYEE APPLICATION
  ============================================================ */

  if (user?.role === "EMPLOYEE") {

    return (

      <Routes>

        {/* =================================================
                    EMPLOYEE APPLICATION

                    EmployeeLayout should contain:

                    /employee/dashboard
                    /employee/assets
                    /employee/requests
                    etc.
                ================================================= */}

        <Route
          path="/employee/*"
          element={
            <ProtectedRoute
              allowedRoles={[
                "EMPLOYEE"
              ]}
            >
              <EmployeeLayout />
            </ProtectedRoute>
          }
        />


        {/* =================================================
                    EMPLOYEE FALLBACK
                ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/employee/dashboard"
              replace
            />
          }
        />

      </Routes>
    );
  }



  /* ============================================================
     ADMIN / IT / SUPERUSER APPLICATION
  ============================================================ */

  return (
    <AppLayout />
  );
}



/* ================================================================
   ROOT APP
================================================================ */

function App() {

  return (

    <BrowserRouter>

      <AuthProvider>

        <AuthenticatedApp />

      </AuthProvider>

    </BrowserRouter>
  );
}


export default App;