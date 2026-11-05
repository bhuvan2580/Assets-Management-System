import secrets
import os
import uuid
import html
import ipaddress
import json

from urllib.request import Request, urlopen
from threading import Thread
from datetime import datetime, timedelta
from functools import wraps
from PIL import Image, UnidentifiedImageError
from datetime import datetime, timezone
from models.token_blocklist import TokenBlocklist

from flask import (
    Blueprint,
    jsonify,
    request,
    current_app,
    send_from_directory,
)

from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from extensions import db, limiter
from models.user import User
from models.employee import Employee
from services.email_service import send_email
from werkzeug.utils import secure_filename



auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ============================================================
# SECURITY SETTINGS
# ============================================================

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

# ============================================================
# PROFILE PHOTO SETTINGS
# ============================================================

ALLOWED_PROFILE_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
}

MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024  # 2 MB


def get_profile_image_folder():
    """
    Store profile photos in backend/uploads/profile_photos/.
    """
    backend_root = os.path.abspath(
        os.path.join(current_app.root_path, "..")
    )

    folder = os.path.join(
        backend_root,
        "uploads",
        "profile_photos",
    )

    os.makedirs(folder, exist_ok=True)

    return folder


def is_allowed_profile_image(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_PROFILE_IMAGE_EXTENSIONS
    )


# ============================================================
# ROLE DEFINITIONS
# ============================================================

USER_ROLES = {
    "SUPERUSER",
    "ADMIN",
    "IT",
}

VALID_ROLES = USER_ROLES | {"EMPLOYEE"}


# ============================================================
# ACCOUNT HELPERS
# ============================================================

def get_current_account():
    """Return the authenticated User or Employee represented by the JWT."""

    identity = get_jwt_identity()
    claims = get_jwt()

    account_type = claims.get("account_type")
    account_id = claims.get("account_id")

    # New tokens explicitly identify their account type.
    if account_type == "EMPLOYEE":
        if not account_id:
            return None
        return db.session.get(Employee, int(account_id))

    if account_type == "USER":
        if not account_id:
            return None
        return db.session.get(User, int(account_id))

    # Backward compatibility with old tokens created before this change.
    # Old tokens used the numeric User id as their identity.
    if identity:
        try:
            return db.session.get(User, int(identity))
        except (TypeError, ValueError):
            return None

    return None


def get_current_user():
    """Return the current system User only."""

    account = get_current_account()

    if isinstance(account, User):
        return account

    return None


def get_current_employee():
    """Return the current Employee only."""

    account = get_current_account()

    if isinstance(account, Employee):
        return account

    return None


def account_is_active(account):
    if isinstance(account, User):
        return bool(account.is_active)

    if isinstance(account, Employee):
        return str(account.status or "").upper() == "ACTIVE"

    return False


def account_must_change_password(account):
    return bool(
        getattr(account, "must_change_password", False)
    )


def account_role(account):
    if isinstance(account, Employee):
        return "EMPLOYEE"

    return getattr(account, "role", None)


def account_email(account):
    return getattr(account, "email", "")


def account_name(account):
    return getattr(account, "name", "")


def send_new_login_alert(account):
    """
    Send an email alert after a successful login.
    Email failures must not interrupt authentication.
    """

    try:
        # The administrator's email address.
        recipient = account_email(account)

        if not recipient:
            current_app.logger.warning(
                "Login alert skipped: user email is not available."
            )
            return

        # Browser and operating system from the request.
        user_agent = request.user_agent

        browser = user_agent.browser or "Unknown browser"
        browser_version = user_agent.version or "Unknown version"
        operating_system = user_agent.platform or "Unknown OS"

        # Best-effort device classification.
        ua_string = request.headers.get("User-Agent", "").lower()

        if "ipad" in ua_string or "tablet" in ua_string:
            device_type = "Tablet"
        elif "mobile" in ua_string or "android" in ua_string:
            device_type = "Mobile device"
        else:
            device_type = "Desktop / PC (inferred)"

        # Obtain the apparent client IP.
        # Do not trust X-Forwarded-For unless your proxy is configured
        # to set and validate it correctly.
        ip_address = request.remote_addr or "Unknown"

        # IP geolocation is approximate.
        location = "Unavailable"

        try:
            parsed_ip = ipaddress.ip_address(ip_address)

            if parsed_ip.is_global:
                geo_request = Request(
                    f"https://ipapi.co/{ip_address}/json/",
                    headers={"User-Agent": "AbylleAssetManagement/1.0"}
                )

                with urlopen(geo_request, timeout=2) as response:
                    geo_data = json.loads(response.read().decode("utf-8"))

                city = geo_data.get("city")
                region = geo_data.get("region")
                country = geo_data.get("country_name")

                location_parts = [
                    part for part in [city, region, country] if part
                ]

                if location_parts:
                    location = ", ".join(location_parts)

        except Exception:
            current_app.logger.warning(
                "Could not retrieve approximate login location."
            )

        # Use the existing email service.
        name = html.escape(str(account_name(account) or "User"))
        email_address = html.escape(str(account_email(account) or ""))
        role = html.escape(str(account_role(account) or "Unknown"))
        timestamp = datetime.now().astimezone().strftime(
            "%d %B %Y, %I:%M:%S %p %Z"
        )

        browser_details = html.escape(
            f"{browser} {browser_version}"
        )
        operating_system = html.escape(str(operating_system))
        device_type = html.escape(device_type)
        ip_address = html.escape(ip_address)
        location = html.escape(location)

        email_html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937;">
            <div style="max-width: 600px; margin: 20px auto;
                        border: 1px solid #e5e7eb; border-radius: 10px;
                        overflow: hidden;">
                <div style="background: #111827; color: white; padding: 22px;">
                    <h2 style="margin: 0;">Abylle Solutions</h2>
                    <p style="margin-bottom: 0;">New Login Detected</p>
                </div>

                <div style="padding: 24px;">
                    <p>Hello {account_name(account)},</p>

                    <p>A successful login to the IT Asset Management
                    System has been detected.</p>

                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>User</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {name}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Email</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {email_address}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Role</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {role}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Date and time</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {html.escape(timestamp)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Browser</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {browser_details}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Operating system</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {operating_system}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>Device type</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {device_type}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                <b>IP address</b>
                            </td>
                            <td style="padding: 9px; border-bottom: 1px solid #eee;">
                                {ip_address}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 9px;">
                                <b>Approximate location</b>
                            </td>
                            <td style="padding: 9px;">
                                {location}
                            </td>
                        </tr>
                    </table>

                    <p style="margin-top: 24px;">
                        If you do not recognise this login, investigate
                        the activity and secure the account if necessary.
                    </p>

                    <p style="color: #6b7280; font-size: 12px;">
                        This is an automated security notification.
                        Location is estimated from the IP address and
                        may not be accurate.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        app = current_app._get_current_object()

        def send_email_in_background():
            with app.app_context():
                try:
                    send_email(
                        recipient=recipient,
                        subject="Security Alert: New Login Detected - Abylle Solutions",
                        html=email_html
                    )
                except Exception:
                    app.logger.exception("Failed to send new login alert email.")

        Thread(
            target=send_email_in_background,
            daemon=True
        ).start()

    except Exception:
        current_app.logger.exception(
            "Failed to send new login alert email."
        )


def account_id(account):
    return getattr(account, "id", None)


def issue_token(account):
    """Create a JWT that explicitly identifies the account table."""

    if isinstance(account, Employee):
        account_type = "EMPLOYEE"
        role = "EMPLOYEE"
    else:
        account_type = "USER"
        role = account.role

    return create_access_token(
        identity=f"{account_type}:{account.id}",
        additional_claims={
            "account_type": account_type,
            "account_id": account.id,
            "role": role,
            "email": account.email,
        },
        expires_delta=ACCESS_TOKEN_EXPIRES
    )


def reset_login_failure_state(account):
    account.failed_login_attempts = 0
    account.locked_until = None


def check_account_lock(account, now):
    locked_until = getattr(account, "locked_until", None)

    if not locked_until:
        return None

    if locked_until > now:
        remaining_seconds = int(
            (locked_until - now).total_seconds()
        )

        remaining_minutes = max(
            1,
            (remaining_seconds + 59) // 60
        )

        return jsonify({
            "success": False,
            "message": (
                f"Too many failed login attempts. "
                f"Try again in approximately "
                f"{remaining_minutes} minute(s)."
            ),
            "locked": True
        }), 429

    account.locked_until = None
    account.failed_login_attempts = 0
    return None


def record_failed_login(account, now):
    account.failed_login_attempts += 1

    if account.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        account.locked_until = (
            now + timedelta(minutes=LOCKOUT_MINUTES)
        )

        db.session.commit()

        return jsonify({
            "success": False,
            "message": (
                "Too many failed login attempts. "
                "Your account has been temporarily locked."
            ),
            "locked": True
        }), 429

    db.session.commit()

    attempts_left = (
        MAX_FAILED_LOGIN_ATTEMPTS
        - account.failed_login_attempts
    )

    return jsonify({
        "success": False,
        "message": "Invalid email or password.",
        "attempts_left": attempts_left
    }), 401


def account_to_response(account):
    if isinstance(account, Employee):
        return {
            "id": account.id,
            "name": account.name,
            "email": account.email,
            "role": "EMPLOYEE",
            "employee_id": account.employee_id,
            "profile_image": account.profile_image,
            "email_verified": account.email_verified,
            "must_change_password": account.must_change_password,
            "department": account.department or "",
            "designation": account.designation or "",
            "cost_center": account.cost_center or "",
            "last_login": (
                account.last_login.isoformat()
                if account.last_login
                else None
            ),
            
        }

    # ------------------------------------------------------------
    # System User
    # ------------------------------------------------------------
    #
    # A User account may also have a corresponding Employee
    # record with the same email address.
    #
    # User itself does not contain employee profile fields.
    # Therefore, read department/designation/cost_center from
    # the matching Employee record when available.
    # ------------------------------------------------------------

    employee = Employee.query.filter_by(
        email=account.email
    ).first()

    return {
        "id": account.id,
        "name": account.name,
        "email": account.email,
        "role": account.role,
        "employee_id": employee.employee_id if employee else None,
        "profile_image": account.profile_image,
        "email_verified": account.email_verified,
        "must_change_password": account.must_change_password,
        "department": (
            employee.department or ""
            if employee
            else ""
        ),
        "designation": (
            employee.designation or ""
            if employee
            else ""
        ),
        "cost_center": (
            employee.cost_center or ""
            if employee
            else ""
        ),
        "last_login": (
            account.last_login.isoformat()
            if account.last_login
            else None
        ),
    }


# ============================================================
# ROLE AUTHORIZATION
# ============================================================

def roles_required(*allowed_roles):
    """Restrict an endpoint to specific roles from either table."""

    def decorator(function):

        @wraps(function)
        @jwt_required()
        def wrapper(*args, **kwargs):

            account = get_current_account()

            if not account:
                return jsonify({
                    "success": False,
                    "message": "Account not found."
                }), 401

            if not account_is_active(account):
                return jsonify({
                    "success": False,
                    "message": "Your account has been disabled."
                }), 403

            if account_must_change_password(account):
                return jsonify({
                    "success": False,
                    "message": (
                        "You must change your password "
                        "before accessing the system."
                    ),
                    "must_change_password": True
                }), 403

            if account_role(account) not in allowed_roles:
                return jsonify({
                    "success": False,
                    "message": (
                        "You are not authorized to perform this action."
                    )
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


# ============================================================
# LOGIN
# ============================================================

# ============================================================
# LOGIN
# ============================================================

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():

    data = request.get_json(silent=True) or {}

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = data.get("password", "")

    selected_access = (
        data.get("account_type")
        or data.get("access_type")
        or ""
    ).strip().upper()

    # --------------------------------------------------------
    # Basic validation
    # --------------------------------------------------------

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    # --------------------------------------------------------
    # Find accounts
    # --------------------------------------------------------

    user = User.query.filter_by(
        email=email
    ).first()

    employee = Employee.query.filter_by(
        email=email
    ).first()

    # --------------------------------------------------------
    # No account
    # --------------------------------------------------------

    if not user and not employee:
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    # --------------------------------------------------------
    # BOTH USER + EMPLOYEE EXIST
    #
    # Your existing functionality is preserved:
    # the frontend must choose which access to use.
    # --------------------------------------------------------


    if user and employee:

        user_password_valid = check_password_hash(
            user.password_hash,
            password
        )

        employee_password_valid = check_password_hash(
            employee.password_hash,
            password
        )

        if not user_password_valid and not employee_password_valid:
            now = datetime.utcnow()

            # Check both accounts for an existing lock.
            user_lock_response = check_account_lock(user, now)
            employee_lock_response = check_account_lock(employee, now)

            # If either account is already locked, reject the login.
            if user_lock_response or employee_lock_response:
                db.session.commit()

                return (
                    user_lock_response
                    if user_lock_response
                    else employee_lock_response
                )

            # Increment both counters as part of the same transaction.
            user.failed_login_attempts += 1
            employee.failed_login_attempts += 1

            user_locked = (
                user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS
            )
            employee_locked = (
                employee.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS
            )

            if user_locked:
                user.locked_until = (
                    now + timedelta(minutes=LOCKOUT_MINUTES)
                )

            if employee_locked:
                employee.locked_until = (
                    now + timedelta(minutes=LOCKOUT_MINUTES)
                )

            db.session.commit()

            if user_locked or employee_locked:
                return jsonify({
                    "success": False,
                    "message": (
                        "Too many failed login attempts. "
                        "Your account has been temporarily locked."
                    ),
                    "locked": True
                }), 429

            attempts_left = min(
                MAX_FAILED_LOGIN_ATTEMPTS - user.failed_login_attempts,
                MAX_FAILED_LOGIN_ATTEMPTS - employee.failed_login_attempts
            )

            return jsonify({
                "success": False,
                "message": "Invalid email or password.",
                "attempts_left": attempts_left
            }), 401


        if selected_access not in {"USER", "EMPLOYEE"}:
            return jsonify({
                "success": True,
                "multiple_access": True,
                "message": "Select how you want to access the system.",
                "access_options": [
                    {
                        "access_type": "USER",
                        "role": user.role,
                        "label": (
                            "Superuser Access"
                            if user.role == "SUPERUSER"
                            else f"{user.role.title()} Access"
                        )
                    },
                    {
                        "access_type": "EMPLOYEE",
                        "role": "EMPLOYEE",
                        "label": "Employee Access"
                    }
                ]
            }), 200

        if selected_access == "USER":
            account = user
        else:
            account = employee


    # --------------------------------------------------------
    # ONLY USER EXISTS
    # --------------------------------------------------------

    elif user:

        account = user

    # --------------------------------------------------------
    # ONLY EMPLOYEE EXISTS
    # --------------------------------------------------------

    else:

        account = employee

    # --------------------------------------------------------
    # Make sure selected account exists
    # --------------------------------------------------------

    if not account:
        return jsonify({
            "success": False,
            "message": "Selected access is not available."
        }), 404

    # --------------------------------------------------------
    # Check account status
    # --------------------------------------------------------

    if not account_is_active(account):

        return jsonify({
            "success": False,
            "message": (
                "Your account has been disabled. "
                "Please contact an administrator."
            )
        }), 403

    # --------------------------------------------------------
    # Check temporary lock
    # --------------------------------------------------------

    now = datetime.utcnow()

    lock_response = check_account_lock(
        account,
        now
    )

    if lock_response:
        return lock_response

    # --------------------------------------------------------
    # CHECK PASSWORD
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # We do NOT treat must_change_password as a
    # login failure.
    #
    # A temporary password is still a valid password.
    #
    # The login should succeed and the frontend can
    # then force the user to change it.
    # --------------------------------------------------------

    password_valid = check_password_hash(
        account.password_hash,
        password
    )

    if not password_valid:

        return record_failed_login(
            account,
            now
        )

    # --------------------------------------------------------
    # Successful login
    # --------------------------------------------------------

    reset_login_failure_state(account)

    account.last_login = now

    db.session.commit()
    
    # Send a new-login security alert.
    send_new_login_alert(account)

    # --------------------------------------------------------
    # Create JWT
    # --------------------------------------------------------

    access_token = issue_token(account)

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "access_token": access_token,
        "multiple_access": False,
        "must_change_password": bool(
            account.must_change_password
        ),
        "account_type": (
            "EMPLOYEE"
            if isinstance(account, Employee)
            else "USER"
        ),
        "user": account_to_response(account)
    }), 200


# ============================================================
# CURRENT ACCOUNT
# ============================================================

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found."
        }), 401

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Your account has been disabled."
        }), 403

    return jsonify({
        "success": True,
        "user": account_to_response(account)
    }), 200


# ============================================================
# UPDATE CURRENT USER PROFILE
# ============================================================

@auth_bp.route(
    "/profile",
    methods=["PUT"]
)
@jwt_required()
def update_profile():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found."
        }), 401

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Your account has been disabled."
        }), 403

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    department = (data.get("department") or "").strip()
    designation = (data.get("designation") or "").strip()
    cost_center = (data.get("cost_center") or "").strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required."
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required."
        }), 400

    # --------------------------------------------------------
    # Employee profile
    # --------------------------------------------------------

    if isinstance(account, Employee):

        existing_employee = Employee.query.filter(
            Employee.email == email,
            Employee.id != account.id
        ).first()

        if existing_employee:
            return jsonify({
                "success": False,
                "message": "This email is already in use by another employee."
            }), 409

        account.name = name
        account.email = email
        account.department = department
        account.designation = designation
        account.cost_center = cost_center

    # --------------------------------------------------------
    # System User profile
    # --------------------------------------------------------

    else:

        existing_user = User.query.filter(
            User.email == email,
            User.id != account.id
        ).first()

        if existing_user:
            return jsonify({
                "success": False,
                "message": "This email is already in use by another user."
            }), 409

        # Update the User account.
        account.name = name

    # Email is kept unchanged.
    # The profile UI treats email as non-editable.
    #
    # If you later decide to allow email changes, this can
    # be changed, but for now we keep the current email.
    
    employee = Employee.query.filter_by(
        email=account.email
    ).first()

    # --------------------------------------------------------
    # Update corresponding Employee profile
    # --------------------------------------------------------

    if employee:
        employee.name = name
        employee.department = department
        employee.designation = designation
        employee.cost_center = cost_center

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully.",
        "user": account_to_response(account)
    }), 200
    
    
# ============================================================
# UPLOAD PROFILE PHOTO
# ============================================================

@auth_bp.route("/profile/photo", methods=["POST"])
@jwt_required()
def upload_profile_photo():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found.",
        }), 401

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Your account has been disabled.",
        }), 403

    if account_must_change_password(account):
        return jsonify({
            "success": False,
            "message": "Change your password before updating your profile.",
        }), 403

    if "photo" not in request.files:
        return jsonify({
            "success": False,
            "message": "No photo was uploaded.",
        }), 400

    photo = request.files["photo"]

    if not photo.filename:
        return jsonify({
            "success": False,
            "message": "Please select an image.",
        }), 400

    safe_name = secure_filename(photo.filename)

    if not safe_name or not is_allowed_profile_image(safe_name):
        return jsonify({
            "success": False,
            "message": "Use a PNG, JPG, JPEG, or WebP image.",
        }), 400

    photo.stream.seek(0, os.SEEK_END)
    file_size = photo.stream.tell()
    photo.stream.seek(0)

    if file_size == 0:
        return jsonify({
            "success": False,
            "message": "The selected image is empty.",
        }), 400

    if file_size > MAX_PROFILE_IMAGE_SIZE:
        return jsonify({
            "success": False,
            "message": "The image must be 2 MB or smaller.",
        }), 400
        
    # Validate the actual image content, not just its extension.
    try:
        photo.stream.seek(0)

        with Image.open(photo.stream) as image:
            if image.format not in {"PNG", "JPEG", "WEBP"}:
                return jsonify({
                    "success": False,
                    "message": "Unsupported image format.",
                }), 400

            image.verify()

        photo.stream.seek(0)

        # Reopen and fully decode the image to catch malformed files.
        with Image.open(photo.stream) as image:
            image.load()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
    ):
        return jsonify({
            "success": False,
            "message": "The uploaded file is not a valid image.",
        }), 400

    finally:
        photo.stream.seek(0)

    extension = safe_name.rsplit(".", 1)[1].lower()

    # Never use the original filename as the saved filename.
    filename = f"{uuid.uuid4().hex}.{extension}"

    folder = get_profile_image_folder()
    filepath = os.path.join(folder, filename)

    old_filename = account.profile_image

    try:
        photo.save(filepath)

        account.profile_image = filename

        db.session.commit()

    except Exception:
        db.session.rollback()

        if os.path.isfile(filepath):
            os.remove(filepath)

        current_app.logger.exception(
            "Failed to upload profile photo."
        )

        return jsonify({
            "success": False,
            "message": "Failed to save the profile photo.",
        }), 500

    # Delete the previous image only after the new filename
    # has been successfully committed to the database.
    if old_filename and old_filename != filename:
        old_path = os.path.join(folder, old_filename)

        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                current_app.logger.warning(
                    "Could not delete the previous profile photo."
                )

    return jsonify({
        "success": True,
        "message": "Profile photo updated successfully.",
        "user": account_to_response(account),
    }), 200
    
# ============================================================
# SERVE PROFILE PHOTO
# ============================================================

@auth_bp.route("/profile/photo/<filename>", methods=["GET"])
@jwt_required()
def get_profile_photo(filename):

    safe_name = secure_filename(filename)

    if (
        not safe_name
        or safe_name != filename
        or not is_allowed_profile_image(safe_name)
    ):
        return jsonify({
            "success": False,
            "message": "Invalid image filename.",
        }), 400

    folder = get_profile_image_folder()

    response = send_from_directory(
        folder,
        safe_name,
    )

    response.headers["Cache-Control"] = "no-cache"

    return response


# ============================================================
# REMOVE PROFILE PHOTO
# ============================================================

@auth_bp.route("/profile/photo", methods=["DELETE"])
@jwt_required()
def remove_profile_photo():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found.",
        }), 401

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Your account has been disabled.",
        }), 403

    old_filename = account.profile_image

    if not old_filename:
        return jsonify({
            "success": True,
            "message": "No profile photo is set.",
            "user": account_to_response(account),
        }), 200

    try:
        account.profile_image = None
        db.session.commit()

    except Exception:
        db.session.rollback()

        current_app.logger.exception(
            "Failed to remove profile photo."
        )

        return jsonify({
            "success": False,
            "message": "Failed to remove the profile photo.",
        }), 500

    # Delete the file after the database change succeeds.
    safe_name = secure_filename(old_filename)

    if safe_name == old_filename:
        old_path = os.path.join(
            get_profile_image_folder(),
            safe_name,
        )

        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                current_app.logger.warning(
                    "Could not delete the removed profile photo."
                )

    return jsonify({
        "success": True,
        "message": "Profile photo removed successfully.",
        "user": account_to_response(account),
    }), 200


# ============================================================
# PASSWORD RESET HELPERS
# ============================================================

def find_reset_account(email, account_type=None):

    account_type = (
        (account_type or "").strip().upper()
    )

    if account_type == "EMPLOYEE":
        return Employee.query.filter_by(
            email=email
        ).first()

    if account_type == "USER":
        return User.query.filter_by(
            email=email
        ).first()

    user = User.query.filter_by(
        email=email
    ).first()

    employee = Employee.query.filter_by(
        email=email
    ).first()

    if user and employee:
        return None

    return user or employee


def create_password_reset_otp(account):

    otp = f"{secrets.randbelow(1_000_000):06d}"

    account.password_reset_otp_hash = generate_password_hash(
        otp,
        method="scrypt"
    )

    account.password_reset_expires_at = (
        datetime.utcnow() + timedelta(minutes=10)
    )

    account.password_reset_attempts = 0

    return otp


def send_password_reset_email(account, otp):

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                margin: 0;
                padding: 0;
                background: #f4f6f8;
                font-family: Arial, Helvetica, sans-serif;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 18px rgba(0,0,0,0.08);
            }}
            .header {{
                background: #111827;
                padding: 28px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                color: #ffffff;
                font-size: 24px;
            }}
            .content {{
                padding: 35px;
                color: #374151;
            }}
            .content h2 {{
                margin-top: 0;
                color: #111827;
            }}
            .otp {{
                margin: 28px 0;
                padding: 18px;
                background: #f3f4f6;
                border-radius: 10px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #111827;
            }}
            .warning {{
                margin-top: 20px;
                padding: 14px;
                background: #fff7ed;
                border-radius: 8px;
                color: #9a3412;
                font-size: 13px;
            }}
            .footer {{
                padding: 20px;
                text-align: center;
                background: #f9fafb;
                color: #9ca3af;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Abylle Solutions</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello {account.name},</p>
                <p>
                    We received a request to reset the password
                    for your Abylle Solutions account.
                </p>
                <p>Use the following OTP to continue:</p>
                <div class="otp">{otp}</div>
                <p>
                    This OTP will expire in
                    <strong>10 minutes</strong>.
                </p>
                <div class="warning">
                    If you did not request a password reset,
                    please ignore this email and contact your
                    system administrator if you believe your
                    account may be compromised.
                </div>
            </div>
            <div class="footer">
                © {datetime.utcnow().year}
                Abylle Solutions · IT Asset Management
            </div>
        </div>
    </body>
    </html>
    """

    send_email(
        recipient=account.email,
        subject="Abylle Solutions - Password Reset OTP",
        html=html
    )


# ============================================================
# FORGOT PASSWORD
# ============================================================

@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3 per hour")
def forgot_password():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    account_type = data.get("account_type", "")

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required."
        }), 400

    generic_response = {
        "success": True,
        "message": (
            "If an account with that email exists, "
            "a password reset OTP has been sent."
        )
    }

    user = User.query.filter_by(email=email).first()
    employee = Employee.query.filter_by(email=email).first()

    # --------------------------------------------------------
    # Same email exists in both tables
    # --------------------------------------------------------

    if user and employee and not account_type:
        return jsonify({
            "success": True,
            "multiple_access": True,
            "message": "Select the account whose password you want to reset.",
            "access_options": [
                {
                    "access_type": "USER",
                    "role": user.role,
                    "label": (
                        "Superuser Access"
                        if user.role == "SUPERUSER"
                        else f"{user.role.title()} Access"
                    )
                },
                {
                    "access_type": "EMPLOYEE",
                    "role": "EMPLOYEE",
                    "label": "Employee Access"
                }
            ]
        }), 200

    account = find_reset_account(
        email,
        account_type
    )

    if not account:
        return jsonify(generic_response), 200

    if not account_is_active(account):
        return jsonify(generic_response), 200

    try:
        otp = create_password_reset_otp(account)
        db.session.commit()

        send_password_reset_email(
            account,
            otp
        )

    except Exception as e:

        db.session.rollback()

        print(
            "Password reset email error:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to process the password reset request "
                "at this time. Please try again later."
            )
        }), 500

    return jsonify(generic_response), 200


# ============================================================
# VERIFY PASSWORD RESET OTP
# ============================================================

@auth_bp.route("/verify-otp", methods=["POST"])
@limiter.limit("10 per hour")
def verify_password_reset_otp():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    account_type = data.get("account_type", "")

    if not email or not otp:
        return jsonify({
            "success": False,
            "message": "Email and OTP are required."
        }), 400

    if not otp.isdigit() or len(otp) != 6:
        return jsonify({
            "success": False,
            "message": "Invalid OTP format."
        }), 400

    account = find_reset_account(
        email,
        account_type
    )

    if not account:
        return jsonify({
            "success": False,
            "message": (
                "Please specify which account you want to reset."
                if not account_type
                else "Invalid or expired OTP."
            )
        }), 400

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Invalid or expired OTP."
        }), 400

    if not account.password_reset_otp_hash:
        return jsonify({
            "success": False,
            "message": "Invalid or expired OTP."
        }), 400

    if (
        not account.password_reset_expires_at
        or datetime.utcnow() > account.password_reset_expires_at
    ):

        account.password_reset_otp_hash = None
        account.password_reset_expires_at = None
        account.password_reset_attempts = 0

        db.session.commit()

        return jsonify({
            "success": False,
            "message": "OTP has expired. Please request a new OTP."
        }), 400

    if account.password_reset_attempts >= 5:

        account.password_reset_otp_hash = None
        account.password_reset_expires_at = None
        account.password_reset_attempts = 0

        db.session.commit()

        return jsonify({
            "success": False,
            "message": (
                "Too many incorrect OTP attempts. "
                "Please request a new OTP."
            )
        }), 429

    if not check_password_hash(
        account.password_reset_otp_hash,
        otp
    ):

        account.password_reset_attempts += 1
        db.session.commit()

        remaining = max(
            0,
            5 - account.password_reset_attempts
        )

        return jsonify({
            "success": False,
            "message": "Invalid OTP.",
            "attempts_remaining": remaining
        }), 400

    return jsonify({
        "success": True,
        "message": "OTP verified successfully.",
        "email": account.email,
        "account_type": (
            "EMPLOYEE"
            if isinstance(account, Employee)
            else "USER"
        )
    }), 200


# ============================================================
# PASSWORD VALIDATION
# ============================================================

def validate_new_password(new_password):

    if len(new_password) < 12:
        return "Password must be at least 12 characters long."

    if not any(char.isupper() for char in new_password):
        return "Password must contain at least one uppercase letter."

    if not any(char.islower() for char in new_password):
        return "Password must contain at least one lowercase letter."

    if not any(char.isdigit() for char in new_password):
        return "Password must contain at least one number."

    if not any(not char.isalnum() for char in new_password):
        return "Password must contain at least one special character."

    return None


# ============================================================
# RESET PASSWORD
# ============================================================

@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per hour")
def reset_password():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    new_password = data.get("new_password", "")
    account_type = data.get("account_type", "")

    if not email or not otp or not new_password:
        return jsonify({
            "success": False,
            "message": (
                "Email, OTP and new password are required."
            )
        }), 400

    if not otp.isdigit() or len(otp) != 6:
        return jsonify({
            "success": False,
            "message": "Invalid OTP format."
        }), 400

    account = find_reset_account(
        email,
        account_type
    )

    if not account:
        return jsonify({
            "success": False,
            "message": "Invalid or expired OTP."
        }), 400

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Invalid or expired OTP."
        }), 400

    if not account.password_reset_otp_hash:
        return jsonify({
            "success": False,
            "message": "Invalid or expired OTP."
        }), 400

    if (
        not account.password_reset_expires_at
        or datetime.utcnow() > account.password_reset_expires_at
    ):

        account.password_reset_otp_hash = None
        account.password_reset_expires_at = None
        account.password_reset_attempts = 0
        db.session.commit()

        return jsonify({
            "success": False,
            "message": (
                "OTP has expired. "
                "Please request a new OTP."
            )
        }), 400

    if account.password_reset_attempts >= 5:

        account.password_reset_otp_hash = None
        account.password_reset_expires_at = None
        account.password_reset_attempts = 0
        db.session.commit()

        return jsonify({
            "success": False,
            "message": (
                "Too many incorrect OTP attempts. "
                "Please request a new OTP."
            )
        }), 429

    if not check_password_hash(
        account.password_reset_otp_hash,
        otp
    ):

        account.password_reset_attempts += 1
        db.session.commit()

        remaining = max(
            0,
            5 - account.password_reset_attempts
        )

        return jsonify({
            "success": False,
            "message": "Invalid OTP.",
            "attempts_remaining": remaining
        }), 400

    password_error = validate_new_password(
        new_password
    )

    if password_error:
        return jsonify({
            "success": False,
            "message": password_error
        }), 400

    if check_password_hash(
        account.password_hash,
        new_password
    ):
        return jsonify({
            "success": False,
            "message": (
                "New password must be different "
                "from your current password."
            )
        }), 400

    account.password_hash = generate_password_hash(
        new_password,
        method="scrypt"
    )

    account.must_change_password = False
    account.password_reset_otp_hash = None
    account.password_reset_expires_at = None
    account.password_reset_attempts = 0
    account.failed_login_attempts = 0
    account.locked_until = None

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Password reset successfully. "
            "You can now log in with your new password."
        )
    }), 200


# ============================================================
# CHANGE PASSWORD
# ============================================================

# ============================================================
# CHANGE PASSWORD
# ============================================================

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found."
        }), 401

    if not account_is_active(account):
        return jsonify({
            "success": False,
            "message": "Your account has been disabled."
        }), 403

    data = request.get_json(silent=True) or {}

    current_password = data.get(
        "current_password",
        ""
    )

    new_password = data.get(
        "new_password",
        ""
    )

    if not new_password:
        return jsonify({
            "success": False,
            "message": "New password is required."
        }), 400

    password_error = validate_new_password(
        new_password
    )

    if password_error:
        return jsonify({
            "success": False,
            "message": password_error
        }), 400

    # ========================================================
    # NORMAL PASSWORD CHANGE
    # ========================================================

    if not account.must_change_password:

        if not current_password:
            return jsonify({
                "success": False,
                "message": "Current password is required."
            }), 400

        if not check_password_hash(
            account.password_hash,
            current_password
        ):
            return jsonify({
                "success": False,
                "message": "Current password is incorrect."
            }), 401

    # ========================================================
    # NEW PASSWORD MUST BE DIFFERENT
    # ========================================================

    if check_password_hash(
        account.password_hash,
        new_password
    ):
        return jsonify({
            "success": False,
            "message": (
                "New password must be different "
                "from the current password."
            )
        }), 400

    # ========================================================
    # SAVE NEW PASSWORD
    # ========================================================

    account.password_hash = generate_password_hash(
        new_password,
        method="scrypt"
    )

    account.must_change_password = False

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Password changed successfully."
    }), 200


# ============================================================
# CHECK PASSWORD CHANGE REQUIREMENT
# ============================================================

@auth_bp.route(
    "/password-status",
    methods=["GET"]
)
@jwt_required()
def password_status():

    account = get_current_account()

    if not account:
        return jsonify({
            "success": False,
            "message": "Account not found."
        }), 401

    return jsonify({
        "success": True,
        "must_change_password": account_must_change_password(account)
    }), 200


# ============================================================
# LOGOUT
# ============================================================

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    token = get_jwt()

    token_id = token.get("jti")
    token_type = token.get("type", "access")
    expiry = token.get("exp")

    if not token_id or not expiry:
        return jsonify({
            "success": False,
            "message": "Invalid token."
        }), 401

    try:
        revoked_token = TokenBlocklist(
            jti=token_id,
            token_type=token_type,
            expires_at=datetime.fromtimestamp(
                expiry,
                tz=timezone.utc,
            ),
        )

        db.session.add(revoked_token)
        db.session.commit()

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to revoke JWT during logout."
        )
        return jsonify({
            "success": False,
            "message": "Logout could not be completed."
        }), 500

    return jsonify({
        "success": True,
        "message": "Logout successful."
    }), 200


# ============================================================
# ADMIN / SUPERUSER TEST ENDPOINT
# ============================================================

@auth_bp.route(
    "/admin-test",
    methods=["GET"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN"
)
def admin_test():

    account = get_current_account()

    return jsonify({
        "success": True,
        "message": "You have administrator access.",
        "role": account_role(account)
    }), 200


# ============================================================
# IT TEAM TEST ENDPOINT
# ============================================================

@auth_bp.route(
    "/it-test",
    methods=["GET"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def it_test():

    account = get_current_account()

    return jsonify({
        "success": True,
        "message": "You have IT team access.",
        "role": account_role(account)
    }), 200


# ============================================================
# SUPERUSER TEST ENDPOINT
# ============================================================

@auth_bp.route(
    "/superuser-test",
    methods=["GET"]
)
@roles_required("SUPERUSER")
def superuser_test():

    account = get_current_account()

    return jsonify({
        "success": True,
        "message": "You have superuser access.",
        "role": account_role(account)
    }), 200
