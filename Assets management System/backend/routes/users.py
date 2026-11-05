from datetime import datetime
import secrets
import string

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.security import generate_password_hash

from extensions import db
from models.user import User
from models.employee import Employee
from routes.auth import get_current_user, roles_required
from services.email_service import send_email

users_bp = Blueprint(
    "users",
    __name__,
    url_prefix="/api/users"
)


VALID_ROLES = {
    "SUPERUSER",
    "ADMIN",
    "IT",
    "EMPLOYEE",
}


# ============================================================
# PASSWORD GENERATOR
# ============================================================

def generate_temporary_password(length=16):
    """
    Generate a cryptographically secure temporary password.

    The password contains:
    - uppercase
    - lowercase
    - number
    - special character
    """

    if length < 12:
        length = 12

    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    numbers = string.digits
    special = "!@#$%^&*()-_=+"

    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(numbers),
        secrets.choice(special),
    ]

    all_characters = (
        uppercase
        + lowercase
        + numbers
        + special
    )

    password.extend(
        secrets.choice(all_characters)
        for _ in range(length - 4)
    )

    # Secure shuffle
    for i in range(len(password) - 1, 0, -1):
        j = secrets.randbelow(i + 1)

        password[i], password[j] = (
            password[j],
            password[i]
        )

    return "".join(password)


# ============================================================
# WELCOME EMAIL
# ============================================================

def send_account_credentials_email(
    user,
    temporary_password
):
    """
    Send the newly created user's temporary credentials.

    The password is sent only through email.
    It is never stored in plain text.
    """

    role_name = user.role.title()

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">

        <style>

            body {{
                margin: 0;
                padding: 0;
                background-color: #f4f6f8;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                color: #1f2937;
            }}

            .email-wrapper {{
                width: 100%;
                padding: 40px 20px;
                box-sizing: border-box;
            }}

            .email-container {{
                max-width: 620px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 14px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
                box-shadow:
                    0 8px 30px rgba(
                        0,
                        0,
                        0,
                        0.06
                    );
            }}

            .header {{
                background: #111827;
                padding: 28px 32px;
                text-align: center;
            }}

            .logo {{
                font-size: 24px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.3px;
            }}

            .subtitle {{
                margin-top: 6px;
                color: #cbd5e1;
                font-size: 13px;
            }}

            .content {{
                padding: 36px 34px;
            }}

            .content h1 {{
                margin: 0 0 12px;
                font-size: 24px;
                color: #111827;
            }}

            .content p {{
                font-size: 14px;
                line-height: 1.7;
                color: #4b5563;
            }}

            .credentials {{
                margin: 28px 0;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 20px;
            }}

            .credential-row {{
                margin-bottom: 16px;
            }}

            .credential-row:last-child {{
                margin-bottom: 0;
            }}

            .label {{
                display: block;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.7px;
                color: #64748b;
                margin-bottom: 6px;
            }}

            .value {{
                font-size: 15px;
                font-weight: 600;
                color: #111827;
                word-break: break-word;
            }}

            .password {{
                display: inline-block;
                padding: 10px 14px;
                background: #ffffff;
                border: 1px dashed #94a3b8;
                border-radius: 7px;
                font-family: monospace;
                font-size: 15px;
                letter-spacing: 0.5px;
                color: #111827;
            }}

            .warning {{
                margin-top: 24px;
                padding: 15px 17px;
                background: #fff7ed;
                border: 1px solid #fed7aa;
                border-radius: 8px;
                color: #9a3412;
                font-size: 13px;
                line-height: 1.6;
            }}

            .footer {{
                border-top: 1px solid #e5e7eb;
                padding: 20px 30px;
                text-align: center;
                background: #f9fafb;
            }}

            .footer p {{
                margin: 0;
                font-size: 12px;
                color: #6b7280;
            }}

        </style>

    </head>

    <body>

        <div class="email-wrapper">

            <div class="email-container">

                <div class="header">

                    <div class="logo">
                        Abylle Solutions
                    </div>

                    <div class="subtitle">
                        IT Asset Management System
                    </div>

                </div>

                <div class="content">

                    <h1>
                        Welcome, {user.name}
                    </h1>

                    <p>
                        Your Abylle Solutions IT Asset Management
                        account has been created successfully.
                    </p>

                    <p>
                        You have been assigned the
                        <strong>{role_name}</strong> role.
                    </p>

                    <div class="credentials">

                        <div class="credential-row">

                            <span class="label">
                                Email
                            </span>

                            <span class="value">
                                {user.email}
                            </span>

                        </div>

                        <div class="credential-row">

                            <span class="label">
                                Role
                            </span>

                            <span class="value">
                                {role_name}
                            </span>

                        </div>

                        <div class="credential-row">

                            <span class="label">
                                Temporary Password
                            </span>

                            <span class="password">
                                {temporary_password}
                            </span>

                        </div>

                    </div>

                    <div class="warning">

                        <strong>Important:</strong>
                        This is a temporary password.
                        You will be required to change it
                        before you can access the system.

                    </div>

                    <p>
                        Please keep this email secure and
                        do not share your credentials with anyone.
                    </p>

                    <p>
                        If you did not expect this account,
                        please contact the IT administrator.
                    </p>

                </div>

                <div class="footer">

                    <p>
                        © Abylle Solutions ·
                        IT Asset Management
                    </p>

                </div>

            </div>

        </div>

    </body>
    </html>
    """

    send_email(
        recipient=user.email,
        subject="Your Abylle Solutions Account Has Been Created",
        html=html
    )


# ============================================================
# USER SERIALIZER
# ============================================================

def user_to_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "employee_id": None,

        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "must_change_password": user.must_change_password,

        "failed_login_attempts": user.failed_login_attempts,

        "locked_until": (
            user.locked_until.isoformat()
            if user.locked_until
            else None
        ),

        "last_login": (
            user.last_login.isoformat()
            if user.last_login
            else None
        ),

        "created_at": (
            user.created_at.isoformat()
            if user.created_at
            else None
        ),

        "updated_at": (
            user.updated_at.isoformat()
            if user.updated_at
            else None
        ),
    }


# ============================================================
# PERMISSION HELPERS
# ============================================================

def can_create_role(current_user, requested_role):
    """
    SUPERUSER:
        Can create all account types.

    ADMIN:
        Can create ADMIN, IT and EMPLOYEE.

    IT / EMPLOYEE:
        Cannot create accounts.
    """

    if current_user.role == "SUPERUSER":
        return requested_role in {
            "SUPERUSER",
            "ADMIN",
            "IT",
            "EMPLOYEE",
        }

    if current_user.role == "ADMIN":
        return requested_role in {
            "ADMIN",
            "IT",
            "EMPLOYEE",
        }

    return False


def can_modify_user(current_user, target_user):
    """
    Determine whether current_user can modify target_user.
    """

    # --------------------------------------------------------
    # SUPERUSER
    # --------------------------------------------------------

    if current_user.role == "SUPERUSER":

        # A SUPERUSER cannot modify another SUPERUSER
        # through normal role/status endpoints.
        if target_user.role == "SUPERUSER":
            return False

        return True

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------

    if current_user.role == "ADMIN":

        # ADMIN cannot modify SUPERUSER
        if target_user.role == "SUPERUSER":
            return False

        # ADMIN cannot modify another ADMIN
        if target_user.role == "ADMIN":
            return False

        # ADMIN can modify IT and EMPLOYEE
        return target_user.role in {
            "IT",
            "EMPLOYEE",
        }

    return False


def can_delete_user(current_user, target_user):
    """
    Determine whether current_user can delete target_user.
    """

    # Never delete yourself
    if current_user.id == target_user.id:
        return False

    # --------------------------------------------------------
    # SUPERUSER
    # --------------------------------------------------------

    if current_user.role == "SUPERUSER":

        # SUPERUSER accounts cannot be deleted
        return target_user.role != "SUPERUSER"

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------

    if current_user.role == "ADMIN":

        # ADMIN can only delete IT and EMPLOYEE
        return target_user.role in {
            "IT",
            "EMPLOYEE",
        }

    return False


# ============================================================
# GET ALL USERS
# ============================================================

@users_bp.route("", methods=["GET"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def get_users():

    users = (
        User.query
        .order_by(User.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "users": [
            user_to_dict(user)
            for user in users
        ],
    }), 200


# ============================================================
# GET SINGLE USER
# ============================================================

@users_bp.route(
    "/<int:user_id>",
    methods=["GET"],
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def get_user(user_id):

    user = db.session.get(
        User,
        user_id,
    )

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found.",
        }), 404

    return jsonify({
        "success": True,
        "user": user_to_dict(user),
    }), 200
    
    
def send_user_credentials_email(
    user,
    temporary_password
):

    role_name = user.role.title()

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
                color: #1f2937;
            }}

            .wrapper {{
                padding: 40px 20px;
            }}

            .container {{
                max-width: 620px;
                margin: auto;
                background: #ffffff;
                border-radius: 14px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            }}

            .header {{
                background: #111827;
                padding: 30px;
                text-align: center;
            }}

            .logo {{
                color: #ffffff;
                font-size: 25px;
                font-weight: 700;
            }}

            .subtitle {{
                margin-top: 6px;
                color: #cbd5e1;
                font-size: 13px;
            }}

            .content {{
                padding: 35px;
            }}

            h1 {{
                margin-top: 0;
                color: #111827;
            }}

            p {{
                color: #4b5563;
                line-height: 1.7;
                font-size: 14px;
            }}

            .credentials {{
                margin: 25px 0;
                padding: 20px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
            }}

            .label {{
                display: block;
                color: #64748b;
                font-size: 11px;
                text-transform: uppercase;
                margin-bottom: 5px;
            }}

            .value {{
                color: #111827;
                font-size: 15px;
                font-weight: 600;
            }}

            .row {{
                margin-bottom: 18px;
            }}

            .row:last-child {{
                margin-bottom: 0;
            }}

            .password {{
                display: inline-block;
                padding: 10px 14px;
                background: #ffffff;
                border: 1px dashed #94a3b8;
                border-radius: 7px;
                font-family: monospace;
                font-size: 15px;
            }}

            .warning {{
                margin-top: 20px;
                padding: 15px;
                background: #fff7ed;
                border: 1px solid #fed7aa;
                border-radius: 8px;
                color: #9a3412;
                font-size: 13px;
                line-height: 1.6;
            }}

            .footer {{
                padding: 20px;
                text-align: center;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
            }}

            .footer p {{
                margin: 0;
                font-size: 12px;
                color: #6b7280;
            }}

        </style>
    </head>

    <body>

        <div class="wrapper">

            <div class="container">

                <div class="header">

                    <div class="logo">
                        Abylle Solutions
                    </div>

                    <div class="subtitle">
                        IT Asset Management System
                    </div>

                </div>

                <div class="content">

                    <h1>
                        Welcome, {user.name}
                    </h1>

                    <p>
                        Your Abylle Solutions IT Asset Management
                        account has been created successfully.
                    </p>

                    <p>
                        Your assigned role is
                        <strong>{role_name}</strong>.
                    </p>

                    <div class="credentials">

                        <div class="row">

                            <span class="label">
                                Email
                            </span>

                            <span class="value">
                                {user.email}
                            </span>

                        </div>

                        <div class="row">

                            <span class="label">
                                Role
                            </span>

                            <span class="value">
                                {role_name}
                            </span>

                        </div>

                        <div class="row">

                            <span class="label">
                                Temporary Password
                            </span>

                            <span class="password">
                                {temporary_password}
                            </span>

                        </div>

                    </div>

                    <div class="warning">

                        <strong>Important:</strong>
                        This is a temporary password.
                        You must change your password before
                        accessing the system.

                    </div>

                    <p>
                        Please keep this email confidential
                        and do not share your credentials.
                    </p>

                </div>

                <div class="footer">

                    <p>
                        © Abylle Solutions · IT Asset Management
                    </p>

                </div>

            </div>

        </div>

    </body>
    </html>
    """

    send_email(
        recipient=user.email,
        subject="Your Abylle Solutions Account Has Been Created",
        html=html
    )


# ============================================================
# CREATE USER
# ============================================================

@users_bp.route("", methods=["POST"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def create_user():

    current_user = get_current_user()

    data = request.get_json(
        silent=True
    ) or {}

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    requested_role = str(
        data.get("role", "EMPLOYEE")
    ).strip().upper()

    employee_id = data.get(
        "employee_id"
    )

    # --------------------------------------------------------
    # Basic validation
    # --------------------------------------------------------

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required.",
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required.",
        }), 400
        
    if not email.endswith("@abylle.com"):

        return jsonify({
            "success": False,
            "message": "Only @abylle.com email addresses are allowed."
        }), 400

    if requested_role not in VALID_ROLES:
        return jsonify({
            "success": False,
            "message": "Invalid user role.",
        }), 400

    # --------------------------------------------------------
    # Permission
    # --------------------------------------------------------

    if not can_create_role(
        current_user,
        requested_role,
    ):
        return jsonify({
            "success": False,
            "message": (
                f"You are not authorized to "
                f"create a {requested_role} account."
            ),
        }), 403

    # --------------------------------------------------------
    # Email uniqueness
    # --------------------------------------------------------

    existing_user = (
        User.query
        .filter_by(email=email)
        .first()
    )

    if existing_user:
        return jsonify({
            "success": False,
            "message": (
                "An account with this email "
                "already exists."
            ),
        }), 409

    # --------------------------------------------------------
    # Employee account validation
    # --------------------------------------------------------

    if requested_role == "EMPLOYEE":

        if not employee_id:
            return jsonify({
                "success": False,
                "message": (
                    "employee_id is required "
                    "for an EMPLOYEE account."
                ),
            }), 400

        employee = db.session.get(
            Employee,
            employee_id,
        )

        if not employee:
            return jsonify({
                "success": False,
                "message": (
                    "The selected employee "
                    "does not exist."
                ),
            }), 404

        # Check whether this employee already
        # has an authentication account.
        existing_employee_account = (
            User.query
            .filter(
                User.employee_id == employee_id
            )
            .first()
        )

        if existing_employee_account:
            return jsonify({
                "success": False,
                "message": (
                    "This employee already "
                    "has a user account."
                ),
            }), 409

    else:

        # Non-employee accounts must not be
        # linked to an employee record.
        employee_id = None

    # --------------------------------------------------------
    # Password handling
    # --------------------------------------------------------

    temporary_password = None
    must_change_password = True
    email_verified = False

    # Check whether an Employee already exists
    # with the same email.
    existing_employee = (
        Employee.query
        .filter_by(email=email)
        .first()
    )

    if existing_employee:
        # ----------------------------------------------------
        # Employee already has an account/password.
        #
        # We cannot retrieve the original plain-text password,
        # but we can reuse the password hash.
        #
        # Therefore both User and Employee will accept
        # the same password.
        # ----------------------------------------------------

        password_hash = existing_employee.password_hash

        must_change_password = False

        email_verified = existing_employee.email_verified

    else:
        # ----------------------------------------------------
        # No Employee exists with this email.
        #
        # Generate a new temporary password.
        # ----------------------------------------------------

        temporary_password = (
            generate_temporary_password()
        )

        password_hash = generate_password_hash(
            temporary_password,
            method="scrypt",
        )

        must_change_password = True

        email_verified = False


    # --------------------------------------------------------
    # Create account
    # --------------------------------------------------------

    user = User(
        name=name,

        email=email,

        password_hash=password_hash,

        role=requested_role,

        is_active=True,

        email_verified=email_verified,

        must_change_password=must_change_password,

        failed_login_attempts=0,

        locked_until=None,
    )

    try:

        db.session.add(user)
        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Failed to create user account."
            ),
        }), 500

    # --------------------------------------------------------
    # SEND ACCOUNT CREDENTIALS
    # --------------------------------------------------------

    email_sent = False

    if temporary_password:
        try:

            send_account_credentials_email(
                user,
                temporary_password
            )

            email_sent = True

        except Exception as email_error:

            email_sent = False

            print(
                "WARNING: User created but "
                "credential email failed:"
            )

            print(email_error)


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    if email_sent:
        return jsonify({
            "success": True,
            "message": (
                "User account created successfully. "
                "Temporary credentials have been "
                "sent to the registered email address."
            ),
            "user": user_to_dict(user),
        }), 201


    # Existing Employee account was found,
    # so no new password was generated.
    if existing_employee:
        return jsonify({
            "success": True,
            "message": (
                "User account created successfully. "
                "The existing Employee password has been "
                "linked to this account."
            ),
            "user": user_to_dict(user),
        }), 201


    return jsonify({
        "success": True,
        "message": (
            "User account created successfully, "
            "but the credential email could not be sent."
        ),
        "email_sent": False,
        "user": user_to_dict(user),
    }), 201


    return jsonify({

        "success": True,

        "message": (
            "User account was created successfully, "
            "but the credential email could not be sent. "
            "Please resend the credentials or check "
            "the email configuration."
        ),

        "email_sent": False,

        "user": user_to_dict(user),

    }), 201


# ============================================================
# CHANGE USER ROLE
# ============================================================

@users_bp.route(
    "/<int:user_id>/role",
    methods=["PUT"],
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def change_role(user_id):

    current_user = get_current_user()

    target_user = db.session.get(
        User,
        user_id,
    )

    if not target_user:
        return jsonify({
            "success": False,
            "message": "User not found.",
        }), 404

    # Cannot change own role
    if current_user.id == target_user.id:
        return jsonify({
            "success": False,
            "message": (
                "You cannot change your own role."
            ),
        }), 400

    # Permission check
    if not can_modify_user(
        current_user,
        target_user,
    ):
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to "
                "modify this account."
            ),
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    new_role = str(
        data.get("role", "")
    ).strip().upper()

    if new_role not in VALID_ROLES:
        return jsonify({
            "success": False,
            "message": "Invalid role.",
        }), 400

    # --------------------------------------------------------
    # ADMIN restrictions
    # --------------------------------------------------------

    if current_user.role == "ADMIN":

        if new_role == "SUPERUSER":
            return jsonify({
                "success": False,
                "message": (
                    "ADMIN cannot assign the "
                    "SUPERUSER role."
                ),
            }), 403

        if target_user.role == "ADMIN":
            return jsonify({
                "success": False,
                "message": (
                    "ADMIN cannot change the "
                    "role of another ADMIN."
                ),
            }), 403

    # --------------------------------------------------------
    # SUPERUSER restrictions
    # --------------------------------------------------------

    if target_user.role == "SUPERUSER":
        return jsonify({
            "success": False,
            "message": (
                "SUPERUSER accounts cannot "
                "be downgraded."
            ),
        }), 403

    # --------------------------------------------------------
    # Employee relationship
    # --------------------------------------------------------

    if new_role == "EMPLOYEE":

        if not target_user.employee_id:
            return jsonify({
                "success": False,
                "message": (
                    "An employee record must be "
                    "linked before assigning the "
                    "EMPLOYEE role."
                ),
            }), 400

        employee = db.session.get(
            Employee,
            target_user.employee_id,
        )

        if not employee:
            return jsonify({
                "success": False,
                "message": (
                    "The linked employee record "
                    "does not exist."
                ),
            }), 404

    else:

        # Remove employee relationship when
        # changing to ADMIN / IT / SUPERUSER.
        target_user.employee_id = None

    target_user.role = new_role

    # Role changes require the user to
    # establish a new password.
    target_user.must_change_password = True

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "User role updated successfully."
        ),
        "user": user_to_dict(target_user),
    }), 200


# ============================================================
# ACTIVATE / DEACTIVATE USER
# ============================================================

@users_bp.route(
    "/<int:user_id>/status",
    methods=["PUT"],
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def change_status(user_id):

    current_user = get_current_user()

    target_user = db.session.get(
        User,
        user_id,
    )

    if not target_user:
        return jsonify({
            "success": False,
            "message": "User not found.",
        }), 404

    # Cannot change own status
    if current_user.id == target_user.id:
        return jsonify({
            "success": False,
            "message": (
                "You cannot change your own "
                "account status."
            ),
        }), 400

    if not can_modify_user(
        current_user,
        target_user,
    ):
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to "
                "modify this account."
            ),
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    if "is_active" not in data:
        return jsonify({
            "success": False,
            "message": (
                "is_active is required."
            ),
        }), 400

    is_active = data.get(
        "is_active"
    )

    if not isinstance(
        is_active,
        bool,
    ):
        return jsonify({
            "success": False,
            "message": (
                "is_active must be "
                "true or false."
            ),
        }), 400

    target_user.is_active = is_active

    # Clear failed login lock when
    # account is activated.
    if is_active:

        target_user.failed_login_attempts = 0

        target_user.locked_until = None

    db.session.commit()

    return jsonify({
        "success": True,

        "message": (
            "User account activated."
            if is_active
            else
            "User account deactivated."
        ),

        "user": user_to_dict(
            target_user
        ),
    }), 200


# ============================================================
# DELETE USER
# ============================================================

@users_bp.route(
    "/<int:user_id>",
    methods=["DELETE"],
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
)
def delete_user(user_id):

    current_user = get_current_user()

    target_user = db.session.get(
        User,
        user_id,
    )

    if not target_user:
        return jsonify({
            "success": False,
            "message": "User not found.",
        }), 404

    # Permission check
    if not can_delete_user(
        current_user,
        target_user,
    ):
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to "
                "delete this account."
            ),
        }), 403

    # Absolute protection for SUPERUSER
    if target_user.role == "SUPERUSER":
        return jsonify({
            "success": False,
            "message": (
                "SUPERUSER accounts "
                "cannot be deleted."
            ),
        }), 403

    try:

        db.session.delete(target_user)
        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Failed to delete user account."
            ),
        }), 500

    return jsonify({
        "success": True,
        "message": (
            "User account deleted successfully."
        ),
    }), 200