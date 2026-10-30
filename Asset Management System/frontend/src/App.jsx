import { useState } from "react";

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



/* ================================================================
   ADMIN / IT / SUPERUSER LAYOUT
================================================================ */

function AppLayout() {

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);


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