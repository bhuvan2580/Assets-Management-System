import {
    useState,
    useRef,
    useEffect
} from "react";

import {
    User,
    ChevronDown,
    Menu,
    X,
    Mail,
    Building2,
    BriefcaseBusiness,
    Badge,
    Shield,
    Save,
    Edit3
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_BASE_URL = `http://${window.location.hostname}:5000/api`;


function Navbar({ onMenuClick }) {

    const {
        user,
        token,
        updateUser,
        isAuthenticated
    } = useAuth();

    const [showDropdown, setShowDropdown] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const [profileImage, setProfileImage] = useState(null);
    const [imageError, setImageError] = useState("");

    const profileImageInputRef = useRef(null);

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const dropdownRef = useRef(null);


    /*
     * Logged-in user
     */

    const userName =
        user?.name ||
        user?.full_name ||
        user?.username ||
        "User";

    const userEmail =
        user?.email ||
        "";

    const userRole =
        user?.role ||
        "Employee";

    const employeeCode =
        user?.employee_code ||
        user?.employee_id ||
        "";

    const department =
        user?.department ||
        "";

    const designation =
        user?.designation ||
        "";

    const currentHour = new Date().getHours();

    const greeting =
        currentHour < 12
            ? "Good Morning"
            : currentHour < 17
                ? "Good Afternoon"
                : "Good Evening";

    const imageStorageKey = userEmail
        ? `profile_image_${userEmail.toLowerCase()}`
        : null;

    /*
     * Profile form
     */

    const [profileForm, setProfileForm] = useState({
        name: "",
        email: "",
        employee_code: "",
        department: "",
        designation: ""
    });


    /*
     * Load user information into form
     */

    useEffect(() => {

        if (user) {

            setProfileForm({
                name:
                    user.name ||
                    user.full_name ||
                    user.username ||
                    "",

                email:
                    user.email ||
                    "",

                employee_code:
                    user.employee_code ||
                    user.employee_id ||
                    "",

                department:
                    user.department ||
                    "",

                designation:
                    user.designation ||
                    ""
            });

        }

    }, [user]);


    /*
     * Close dropdown when clicking outside
     */

    useEffect(() => {

        const handleClickOutside = (event) => {

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {

                setShowDropdown(false);

            }

        };


        document.addEventListener(
            "mousedown",
            handleClickOutside
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

        };

    }, []);

    // Load the profile image URL from the logged-in user's Flask data.
    useEffect(() => {
        const filename = user?.profile_image;

        if (!filename) {
            setProfileImage(null);
            return;
        }

        setProfileImage(
            `${API_BASE_URL}/auth/profile/photo/${encodeURIComponent(
                filename
            )}?t=${Date.now()}`
        );
    }, [user?.profile_image]);


    // Open the file picker.
    const handleEditProfileImage = () => {
        profileImageInputRef.current?.click();
    };

    // Validate and preview the selected image.
    const handleProfileImageChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setImageError("");

        if (!file.type.startsWith("image/")) {
            setImageError("Please select a valid image.");
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setImageError("Image size must be 2 MB or smaller.");
            event.target.value = "";
            return;
        }

        if (!token) {
            setImageError("Your session has expired. Please log in again.");
            event.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("photo", file);

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/profile/photo`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to upload profile photo."
                );
            }

            const savedUser = data.user;

            if (!savedUser?.profile_image) {
                throw new Error(
                    "Photo uploaded, but Flask did not return the saved filename."
                );
            }

            updateUser(savedUser);

            setProfileImage(
                `${API_BASE_URL}/auth/profile/photo/${encodeURIComponent(
                    savedUser.profile_image
                )}?t=${Date.now()}`
            );

            setImageError("");
            setMessage("Profile photo updated successfully.");

        } catch (error) {
            console.error("Profile photo upload failed:", error);

            setImageError(
                error.message || "Failed to upload profile photo."
            );
        } finally {
            event.target.value = "";
        }
    };

    // Remove the image and restore the initial-letter avatar.
    const handleRemoveProfileImage = async () => {
        if (!token) {
            setImageError("Please log in again.");
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/profile/photo`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to remove profile photo."
                );
            }

            if (data.user) {
                updateUser(data.user);
            }

            setProfileImage(null);
            setImageError("");
            setMessage("Profile photo removed successfully.");

        } catch (error) {
            console.error("Profile photo removal failed:", error);

            setImageError(
                error.message || "Failed to remove profile photo."
            );
        }
    };


    /*
     * Open profile
     */

    const openProfile = () => {

        setShowDropdown(false);

        setMessage("");
        setError("");

        setShowProfileModal(true);

    };


    /*
     * Handle input changes
     */

    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;


        setProfileForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    /*
     * Save profile
     *
     * IMPORTANT:
     * Change this endpoint if your backend
     * uses a different profile-update route.
     */

    const handleSaveProfile = async (event) => {

        event.preventDefault();

        setSaving(true);
        setMessage("");
        setError("");

        try {

            if (!token) {
                throw new Error(
                    "Authentication token not found."
                );
            }


            const response = await fetch(
                `${API_BASE_URL}/auth/profile`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        name:
                            profileForm.name.trim(),

                        email:
                            profileForm.email.trim(),

                        department:
                            profileForm.department.trim(),

                        designation:
                            profileForm.designation.trim()
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    data?.error ||
                    "Failed to update profile."
                );

            }


            /*
             * Backend should return the
             * updated user object.
             */
            if (data.user) {

                updateUser(
                    data.user
                );

            }


            setMessage(
                "Profile updated successfully."
            );


            setTimeout(() => {

                setShowProfileModal(
                    false
                );

            }, 1000);


        } catch (err) {

            console.error(
                "Profile update error:",
                err
            );

            setError(
                err.message ||
                "Failed to update profile."
            );

        } finally {

            setSaving(false);

        }
    };


    /*
     * Don't render user-specific navbar
     * if authentication is not ready.
     */

    if (!isAuthenticated) {
        return null;
    }


    return (

        <>

            {/* =================================================
                NAVBAR
            ================================================= */}

            <header className="navbar">


                {/* Mobile menu */}

                <button
                    className="mobile-menu-button"
                    onClick={onMenuClick}
                    aria-label="Toggle menu"
                >

                    <Menu size={24} />

                </button>


                {/* Welcome */}

                <div className="navbar-welcome">

                    <h3>
                        {greeting}, {userName}
                    </h3>

                    <p>
                        Here's what's happening with
                        your assets today.
                    </p>

                </div>


                {/* =================================================
                    PROFILE
                ================================================= */}

                <div
                    className="navbar-profile-wrapper"
                    ref={dropdownRef}
                >

                    <button
                        className="user-profile"
                        onClick={() =>
                            setShowDropdown(
                                (previous) =>
                                    !previous
                            )
                        }
                    >

                        <div className="avatar profile-avatar-image">
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt={`${userName}'s profile`}
                                />
                            ) : (
                                <span>
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>


                        <div className="user-profile-info">

                            <strong>
                                {userName}
                            </strong>

                            <span>
                                {designation ||
                                    userRole}
                            </span>

                        </div>


                        <ChevronDown
                            size={17}
                            className={
                                showDropdown
                                    ? "profile-chevron rotate"
                                    : "profile-chevron"
                            }
                        />

                    </button>


                    {/* =================================================
                        PROFILE DROPDOWN
                    ================================================= */}

                    {showDropdown && (

                        <div className="profile-dropdown">

                            <div className="profile-dropdown-user">

                                <div className="profile-dropdown-avatar profile-avatar-image">
                                    {profileImage ? (
                                        <img
                                            src={profileImage}
                                            alt={`${userName}'s profile`}
                                        />
                                    ) : (
                                        <span>
                                            {userName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>


                                <div>

                                    <strong>
                                        {userName}
                                    </strong>

                                    <span>
                                        {userEmail}
                                    </span>

                                </div>

                            </div>


                            <div className="profile-dropdown-divider" />


                            <button
                                className="profile-dropdown-item"
                                onClick={openProfile}
                            >

                                <User size={17} />

                                <span>
                                    My Profile
                                </span>

                            </button>

                        </div>

                    )}

                </div>

            </header>


            {/* =====================================================
                PROFILE MODAL
            ===================================================== */}

            {showProfileModal && (

                <div
                    className="profile-modal-overlay"
                    onClick={() => {

                        if (!saving) {
                            setShowProfileModal(false);
                        }

                    }}
                >

                    <div
                        className="profile-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >


                        {/* HEADER */}

                        <div className="profile-modal-header">

                            <div>

                                <h2>
                                    My Profile
                                </h2>

                                <p>
                                    View and update your
                                    account information.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="profile-modal-close"
                                onClick={() =>
                                    setShowProfileModal(false)
                                }
                                disabled={saving}
                            >

                                <X size={20} />

                            </button>

                        </div>


                        {/* BODY */}

                        <form
                            onSubmit={handleSaveProfile}
                            className="profile-modal-form"
                        >

                            <div className="profile-modal-body">


                                {/* PROFILE HEADER */}

                                <div className="profile-modal-user">

                                    <div className="profile-avatar-editor">

                                        <div className="profile-large-avatar profile-avatar-image">
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt={`${userName}'s profile`}
                                                />
                                            ) : (
                                                <span>
                                                    {userName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="profile-avatar-edit-button"
                                            onClick={handleEditProfileImage}
                                            title="Change profile picture"
                                            aria-label="Change profile picture"
                                        >
                                            <Edit3 size={15} />
                                        </button>

                                        <input
                                            ref={profileImageInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/gif"
                                            onChange={handleProfileImageChange}
                                            hidden
                                        />

                                    </div>

                                    {profileImage && (
                                        <button
                                            type="button"
                                            className="profile-avatar-remove-button"
                                            onClick={handleRemoveProfileImage}
                                        >
                                            Remove photo
                                        </button>
                                    )}

                                    {imageError && (
                                        <p className="profile-avatar-error">
                                            {imageError}
                                        </p>
                                    )}


                                    <div>

                                        <h3>
                                            {userName}
                                        </h3>

                                        <p>
                                            {userRole}
                                        </p>

                                    </div>

                                </div>


                                {/* SUCCESS */}

                                {message && (

                                    <div className="profile-success">
                                        {message}
                                    </div>

                                )}


                                {/* ERROR */}

                                {error && (

                                    <div className="profile-error">
                                        {error}
                                    </div>

                                )}


                                {/* FORM */}

                                <div className="profile-form-grid">


                                    {/* NAME */}

                                    <div className="profile-field">

                                        <label>
                                            Full Name
                                        </label>

                                        <div className="profile-input-wrapper">

                                            <User size={17} />

                                            <input
                                                type="text"
                                                name="name"
                                                value={
                                                    profileForm.name
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            />

                                        </div>

                                    </div>


                                    {/* EMAIL */}

                                    <div className="profile-field">
                                        <label>Email</label>

                                        <div className="profile-input-wrapper disabled">
                                            <Mail size={18} />

                                            <input
                                                type="email"
                                                value={profileForm.email || ""}
                                                disabled
                                            />
                                        </div>

                                        <small>
                                            Email cannot be changed.
                                        </small>
                                    </div>


                                    {/* EMPLOYEE ID */}

                                    <div className="profile-field">

                                        <label>
                                            Employee ID
                                        </label>

                                        <div className="profile-input-wrapper">

                                            <Badge size={17} />

                                            <input
                                                type="text"
                                                value={
                                                    profileForm.employee_code
                                                }
                                                disabled
                                            />

                                        </div>

                                        <small>
                                            Employee ID cannot
                                            be changed.
                                        </small>

                                    </div>


                                    {/* DEPARTMENT */}

                                    <div className="profile-field">

                                        <label>
                                            Department
                                        </label>

                                        <div className="profile-input-wrapper">

                                            <Building2
                                                size={17}
                                            />

                                            <input
                                                type="text"
                                                name="department"
                                                value={
                                                    profileForm.department
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            />

                                        </div>

                                    </div>


                                    {/* DESIGNATION */}

                                    <div className="profile-field">

                                        <label>
                                            Designation
                                        </label>

                                        <div className="profile-input-wrapper">

                                            <BriefcaseBusiness
                                                size={17}
                                            />

                                            <input
                                                type="text"
                                                name="designation"
                                                value={
                                                    profileForm.designation
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            />

                                        </div>

                                    </div>


                                    {/* ROLE */}

                                    <div className="profile-field">

                                        <label>
                                            Role
                                        </label>

                                        <div className="profile-input-wrapper">

                                            <Shield
                                                size={17}
                                            />

                                            <input
                                                type="text"
                                                value={
                                                    userRole
                                                }
                                                disabled
                                            />

                                        </div>

                                        <small>
                                            Your role is managed
                                            by the administrator.
                                        </small>

                                    </div>

                                </div>

                            </div>


                            {/* FOOTER */}

                            <div className="profile-modal-footer">

                                <button
                                    type="button"
                                    className="profile-cancel-button"
                                    onClick={() =>
                                        setShowProfileModal(false)
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="profile-save-button"
                                    disabled={saving}
                                >

                                    <Save size={17} />

                                    {saving
                                        ? "Saving..."
                                        : "Save Changes"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </>

    );

}


export default Navbar;