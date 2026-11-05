from flask import Blueprint, jsonify, request, current_app
from datetime import date, datetime
from io import BytesIO
from secrets import token_urlsafe

from openpyxl import load_workbook

from werkzeug.security import generate_password_hash

from extensions import db
from models.employee import Employee
from models.assignment import AssetAssignment
from models.user import User

from routes.auth import roles_required


employees_bp = Blueprint(
    "employees",
    __name__,
    url_prefix="/api/employees"
)


# ============================================================
# GET ALL EMPLOYEES
# SUPERUSER / ADMIN / IT
# ============================================================

@employees_bp.route("", methods=["GET"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def get_employees():

    search = request.args.get("search")
    status = request.args.get("status")

    query = Employee.query

    if status and status != "ALL":
        query = query.filter(
            Employee.status == status
        )

    if search:

        search_term = f"%{search}%"

        query = query.filter(
            db.or_(
                Employee.employee_id.ilike(search_term),
                Employee.name.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.department.ilike(search_term),
                Employee.designation.ilike(search_term),
                Employee.cost_center.ilike(search_term)
            )
        )

    employees = query.order_by(
        Employee.name.asc()
    ).all()

    return jsonify([
        employee_to_dict(employee)
        for employee in employees
    ])


# ============================================================
# GET SINGLE EMPLOYEE
# SUPERUSER / ADMIN / IT
# ============================================================

@employees_bp.route(
    "/<int:employee_id>",
    methods=["GET"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def get_employee(employee_id):

    employee = db.session.get(
        Employee,
        employee_id
    )

    if not employee:
        return jsonify({
            "message": "Employee not found"
        }), 404

    return jsonify(
        employee_to_dict(employee)
    )


# ============================================================
# CREATE EMPLOYEE
# SUPERUSER / ADMIN / IT
# ============================================================

@employees_bp.route("", methods=["POST"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def create_employee():

    data = request.get_json() or {}

    # ========================================================
    # VALIDATION
    # ========================================================

    employee_id = (
        data.get("employee_id") or ""
    ).strip()

    name = (
        data.get("name") or ""
    ).strip()

    email = (
        data.get("email") or ""
    ).strip().lower()

    if not employee_id:

        return jsonify({
            "message": "Employee ID is required"
        }), 400

    if not name:

        return jsonify({
            "message": "Employee name is required"
        }), 400

    if not email:

        return jsonify({
            "message": "Email is required"
        }), 400
        
    if not email.endswith("@abylle.com"):

        return jsonify({
            "message": "Only @abylle.com email addresses are allowed."
        }), 400

    # ========================================================
    # CHECK DUPLICATE EMPLOYEE ID
    # ========================================================

    existing_employee_id = Employee.query.filter_by(
        employee_id=employee_id
    ).first()

    if existing_employee_id:

        return jsonify({
            "message": "Employee ID already exists"
        }), 409

    # ========================================================
    # CHECK DUPLICATE EMPLOYEE EMAIL
    # ========================================================

    existing_employee_email = Employee.query.filter_by(
        email=email
    ).first()

    if existing_employee_email:

        return jsonify({
            "message": "Employee email already exists"
        }), 409

    # ========================================================
    # IMPORTANT
    #
    # We intentionally DO NOT reject the email if it already
    # exists in the users table.
    #
    # Example:
    #
    # users:
    #     admin@abylle.com -> ADMIN
    #
    # employees:
    #     admin@abylle.com -> EMPLOYEE
    #
    # This is allowed because the login system will later show
    # the user an access-selection popup.
    # ========================================================

    # ========================================================
    # CHECK EXISTING USER ACCOUNT
    # ========================================================

    existing_user = User.query.filter_by(
        email=email
    ).first()


    # ========================================================
    # PASSWORD HANDLING
    # ========================================================

    if existing_user:
        # ----------------------------------------------------
        # The email already belongs to a User account.
        #
        # Reuse the existing password hash so both
        # User and Employee accounts use the same password.
        # ----------------------------------------------------

        password_hash = existing_user.password_hash
        temporary_password = None
        must_change_password = False

    else:
        # ----------------------------------------------------
        # No User account exists.
        #
        # Generate a new temporary password for the
        # Employee account.
        # ----------------------------------------------------

        temporary_password = token_urlsafe(10)

        password_hash = generate_password_hash(
            temporary_password,
            method="scrypt"
        )

        must_change_password = True

    # ========================================================
    # CREATE EMPLOYEE
    # ========================================================

    employee = Employee(

        employee_id=employee_id,

        name=name,

        email=email,

        phone=data.get("phone"),

        department=data.get("department"),

        designation=data.get("designation"),

        cost_center=data.get("cost_center"),

        joining_date=parse_date(
            data.get("joining_date")
        ),

        status=data.get(
            "status",
            "ACTIVE"
        ),

        # Authentication
        # Authentication
        password_hash=password_hash,

        must_change_password=must_change_password,

        email_verified=(
            existing_user.email_verified
            if existing_user
            else False
        ),

        failed_login_attempts=0,

        locked_until=None,

        last_login=None,

        # Password reset
        password_reset_otp_hash=None,

        password_reset_expires_at=None,

        password_reset_attempts=0
    )

    # ========================================================
    # SAVE EMPLOYEE
    # ========================================================

    try:

        db.session.add(employee)

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Failed to create employee",
            "error": str(e)
        }), 500

    # ========================================================
    # SEND TEMPORARY PASSWORD
    # ========================================================

    if existing_user:

        # ----------------------------------------------------
        # Existing user account found.
        #
        # The employee is now using the same password as the
        # existing user account.
        #
        # We cannot send the password again because we only
        # have the password hash, not the plaintext password.
        # ----------------------------------------------------

        return jsonify({

            "message": (
                "Employee created successfully. "
                "The employee is linked to the existing "
                "user account and uses the same password."
            ),

            "email_sent": False,

            "existing_user": True,

            "employee":
                employee_to_dict(employee)

        }), 201


    # ========================================================
    # SEND NEW TEMPORARY PASSWORD
    # ========================================================

    try:

        send_employee_credentials_email(
            employee,
            temporary_password
        )

    except Exception as e:

        # ----------------------------------------------------
        # Employee has already been created.
        # Do not delete the employee if email fails.
        # ----------------------------------------------------

        current_app.logger.error(
            "Employee created but credential email failed: %s",
            str(e)
        )

        return jsonify({

            "message": (
                "Employee created successfully, "
                "but the temporary password email "
                "could not be sent."
            ),

            "email_sent": False,

            "employee":
                employee_to_dict(employee)

        }), 201


    # ========================================================
    # SUCCESS
    # ========================================================

    return jsonify({

        "message": (
            "Employee created successfully. "
            "Temporary password has been sent "
            "to the employee's email."
        ),

        "email_sent": True,

        "existing_user": False,

        "employee":
            employee_to_dict(employee)

    }), 201
    
    
# ============================================================
# BULK UPLOAD EMPLOYEES FROM EXCEL
# SUPERUSER / ADMIN / IT
#
# IMPORTANT:
# No temporary-password emails are sent from this endpoint.
# ============================================================

@employees_bp.route("/bulk-upload", methods=["POST"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def bulk_upload_employees():

    uploaded_file = request.files.get("file")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "message": "Please select an Excel file."
        }), 400

    if not uploaded_file.filename.lower().endswith(".xlsx"):
        return jsonify({
            "message": "Only .xlsx Excel files are supported."
        }), 400

    try:
        workbook = load_workbook(
            filename=BytesIO(uploaded_file.read()),
            read_only=True,
            data_only=True
        )

        worksheet = workbook.active

    except Exception:
        return jsonify({
            "message": "Unable to read the Excel file. Please use the provided template."
        }), 400

    rows = worksheet.iter_rows(values_only=True)
    headers = next(rows, None)

    if not headers:
        workbook.close()

        return jsonify({
            "message": "The Excel sheet is empty."
        }), 400

    # Normalize Excel column names
    def normalize_header(value):

        return "".join(
            character.lower()
            for character in str(value or "").strip()
            if character.isalnum()
        )

    header_map = {
        normalize_header(header): index
        for index, header in enumerate(headers)
        if header is not None
    }

    # Supported Excel column names
    aliases = {
        "employee_id": ["employeeid", "empid"],
        "name": ["name", "fullname", "employeename"],
        "email": ["email", "emailaddress", "workemail"],
        "phone": ["phone", "phonenumber", "mobile", "mobilenumber"],
        "department": ["department", "dept"],
        "designation": ["designation", "jobtitle", "title"],
        "cost_center": ["costcenter"],
        "joining_date": ["joiningdate", "dateofjoining", "doj"]
    }

    column_indexes = {}

    for field, possible_headers in aliases.items():

        for header in possible_headers:

            if header in header_map:
                column_indexes[field] = header_map[header]
                break

    # Required columns
    required_fields = [
        "employee_id",
        "name",
        "email"
    ]

    missing_fields = [
        field.replace("_", " ").title()
        for field in required_fields
        if field not in column_indexes
    ]

    if missing_fields:

        workbook.close()

        return jsonify({
            "message": (
                "Missing required columns: "
                + ", ".join(missing_fields)
            )
        }), 400

    imported = []
    skipped = []

    seen_employee_ids = set()
    seen_emails = set()

    try:

        for row_number, row in enumerate(rows, start=2):

            # Ignore completely empty rows
            if not row or not any(
                value is not None and str(value).strip()
                for value in row
            ):
                continue

            def get_cell(field):

                index = column_indexes.get(field)

                if index is None or index >= len(row):
                    return None

                return row[index]

            employee_id = str(
                get_cell("employee_id") or ""
            ).strip()

            name = str(
                get_cell("name") or ""
            ).strip()

            email = str(
                get_cell("email") or ""
            ).strip().lower()

            # --------------------------------------------
            # VALIDATION
            # --------------------------------------------

            if not employee_id:

                skipped.append({
                    "row": row_number,
                    "employee_id": "",
                    "reason": "Employee ID is required."
                })
                continue

            if not name:

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Employee name is required."
                })
                continue

            if not email:

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Email is required."
                })
                continue

            if not email.endswith("@abylle.com"):

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Only @abylle.com email addresses are allowed."
                })
                continue

            # --------------------------------------------
            # DUPLICATE CHECKS WITHIN EXCEL
            # --------------------------------------------

            if employee_id.lower() in seen_employee_ids:

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Duplicate Employee ID in Excel."
                })
                continue

            if email in seen_emails:

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Duplicate email in Excel."
                })
                continue

            # --------------------------------------------
            # DUPLICATE CHECKS IN DATABASE
            # --------------------------------------------

            if Employee.query.filter_by(
                employee_id=employee_id
            ).first():

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Employee ID already exists."
                })
                continue

            if Employee.query.filter_by(
                email=email
            ).first():

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Employee email already exists."
                })
                continue

            # --------------------------------------------
            # JOINING DATE
            # --------------------------------------------

            try:

                joining_date = parse_date(
                    get_cell("joining_date")
                )

            except (ValueError, TypeError):

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Invalid Joining Date."
                })
                continue

            # --------------------------------------------
            # CHECK EXISTING USER ACCOUNT
            # --------------------------------------------

            existing_user = User.query.filter_by(
                email=email
            ).first()

            if existing_user:

                password_hash = existing_user.password_hash
                must_change_password = False
                email_verified = existing_user.email_verified

            else:

                # Generate a password hash.
                # DO NOT SEND ANY EMAIL DURING BULK UPLOAD.

                temporary_password = token_urlsafe(16)

                password_hash = generate_password_hash(
                    temporary_password,
                    method="scrypt"
                )

                must_change_password = True
                email_verified = False

            # --------------------------------------------
            # CREATE EMPLOYEE
            # --------------------------------------------

            employee = Employee(

                employee_id=employee_id,

                name=name,

                email=email,

                phone=(
                    str(get_cell("phone")).strip()
                    if get_cell("phone") is not None
                    else None
                ),

                department=(
                    str(get_cell("department")).strip()
                    if get_cell("department") is not None
                    else None
                ),

                designation=(
                    str(get_cell("designation")).strip()
                    if get_cell("designation") is not None
                    else None
                ),

                cost_center=(
                    str(get_cell("cost_center")).strip()
                    if get_cell("cost_center") is not None
                    else None
                ),

                joining_date=joining_date,

                status="ACTIVE",

                password_hash=password_hash,

                must_change_password=must_change_password,

                email_verified=email_verified,

                failed_login_attempts=0,

                locked_until=None,

                last_login=None,

                password_reset_otp_hash=None,

                password_reset_expires_at=None,

                password_reset_attempts=0
            )

            try:

                # Savepoint allows other rows to continue
                # if one employee cannot be inserted.

                with db.session.begin_nested():

                    db.session.add(employee)
                    db.session.flush()

                imported.append({

                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "email": employee.email,
                    "linked_existing_user": bool(existing_user)

                })

                seen_employee_ids.add(employee_id.lower())
                seen_emails.add(email)

            except Exception as error:

                current_app.logger.warning(
                    "Bulk employee import failed at row %s: %s",
                    row_number,
                    str(error)
                )

                skipped.append({
                    "row": row_number,
                    "employee_id": employee_id,
                    "reason": "Could not save employee. Check for duplicate or invalid data."
                })

        db.session.commit()

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Bulk employee upload failed: %s",
            str(error)
        )

        workbook.close()

        return jsonify({
            "message": "Bulk upload failed. No employees from this upload were saved."
        }), 500

    workbook.close()

    return jsonify({

        "message": "Bulk employee upload completed.",

        "imported_count": len(imported),

        "skipped_count": len(skipped),

        "imported": imported,

        "skipped": skipped,

        "credential_emails_sent": False,

        "credential_note": (
            "No temporary-password emails were sent. "
            "Newly created employees can use Forgot Password "
            "to set their password. Employees linked to an "
            "existing user account continue using that account's password."
        )

    }), 200


# ============================================================
# UPDATE EMPLOYEE
# SUPERUSER / ADMIN / IT
# ============================================================

@employees_bp.route(
    "/<int:employee_id>",
    methods=["PUT"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def update_employee(employee_id):

    employee = db.session.get(
        Employee,
        employee_id
    )

    if not employee:

        return jsonify({
            "message": "Employee not found"
        }), 404

    data = request.get_json() or {}


    # ========================================================
    # UPDATE BASIC FIELDS
    # ========================================================
    # Employee ID and Email are immutable after creation.

    fields = [
        "name",
        "phone",
        "department",
        "designation",
        "cost_center",
        "status"
    ]

    for field in fields:

        if field in data:

            value = data[field]

            if isinstance(value, str):
                value = value.strip()

            setattr(
                employee,
                field,
                value
            )


    # ========================================================
    # JOINING DATE
    # ========================================================

    if "joining_date" in data:

        employee.joining_date = parse_date(
            data["joining_date"]
        )


    # ========================================================
    # SAVE
    # ========================================================

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message":
                "Failed to update employee",
            "error":
                str(e)
        }), 500


    return jsonify({

        "message":
            "Employee updated successfully",

        "employee":
            employee_to_dict(employee)

    })


# ============================================================
# DELETE EMPLOYEE
# SUPERUSER / ADMIN / IT
# ============================================================

@employees_bp.route(
    "/<int:employee_id>",
    methods=["DELETE"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def delete_employee(employee_id):

    employee = db.session.get(
        Employee,
        employee_id
    )

    if not employee:

        return jsonify({
            "message": "Employee not found"
        }), 404

    # ========================================================
    # PREVENT DELETION IF EMPLOYEE CURRENTLY HOLDS ASSETS
    # ========================================================

    active_assignments = [
        assignment
        for assignment in employee.assignments
        if assignment.actual_return_date is None
    ]

    if active_assignments:

        return jsonify({

            "message": (
                "Employee cannot be deleted while "
                "they have assigned assets. "
                "Return all assigned assets first."
            ),

            "assigned_asset_count":
                len(active_assignments)

        }), 409

    try:

        # ====================================================
        # PRESERVE EMPLOYEE INFORMATION
        # IN ASSIGNMENT HISTORY
        # ====================================================

        for assignment in employee.assignments:

            if not assignment.employee_code:

                assignment.employee_code = (
                    employee.employee_id
                )

            if not assignment.employee_name:

                assignment.employee_name = (
                    employee.name
                )

            if not assignment.employee_email:

                assignment.employee_email = (
                    employee.email
                )

        # ====================================================
        # DELETE EMPLOYEE
        #
        # PostgreSQL ON DELETE SET NULL will automatically
        # change assignment.employee_id to NULL.
        # ====================================================

        db.session.delete(employee)

        db.session.commit()

        return jsonify({

            "message": (
                "Employee deleted successfully. "
                "Assignment history has been preserved."
            )

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({

            "message":
                "Failed to delete employee",

            "error":
                str(e)

        }), 500


# ============================================================
# DATE PARSER
# ============================================================

def parse_date(value):

    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    value = str(value).strip()

    for date_format in (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y"
    ):

        try:

            return datetime.strptime(
                value,
                date_format
            ).date()

        except ValueError:
            continue

    raise ValueError(
        "Invalid date format"
    )


# ============================================================
# EMPLOYEE CREDENTIAL EMAIL
# ============================================================

def send_employee_credentials_email(
    employee,
    temporary_password
):

    """
    Sends the employee their initial login credentials.

    IMPORTANT:
    This function assumes your Flask application already has
    the required mail configuration.

    If your existing auth.py has a shared email helper,
    we should use that helper here instead of creating
    another SMTP implementation.
    """

    from flask_mail import Message
    from extensions import mail

    message = Message(

        subject="Abylle Solutions - Employee Account Created",

        recipients=[
            employee.email
        ]

    )

    message.body = f"""
Hello {employee.name},

Your employee account for the Abylle Solutions
IT Asset Management System has been created.

Employee ID: {employee.employee_id}
Email: {employee.email}

Temporary Password:
{temporary_password}

Please log in using these credentials.

For security reasons, you will be required to
change this temporary password after your first login.

Regards,
Abylle Solutions
IT Department
"""

    message.html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>
        Abylle Solutions Employee Account
    </title>
</head>

<body>

    <h2>
        Welcome to Abylle Solutions
    </h2>

    <p>
        Hello {employee.name},
    </p>

    <p>
        Your employee account for the
        <strong>
            Abylle Solutions IT Asset Management System
        </strong>
        has been created.
    </p>

    <p>
        <strong>Employee ID:</strong>
        {employee.employee_id}
    </p>

    <p>
        <strong>Email:</strong>
        {employee.email}
    </p>

    <p>
        <strong>Temporary Password:</strong>
        {temporary_password}
    </p>

    <p>
        Please log in using these credentials.
    </p>

    <p>
        For security reasons, you will be required to
        change this temporary password after your first login.
    </p>

    <p>
        Regards,<br>
        <strong>Abylle Solutions</strong><br>
        IT Department
    </p>

</body>
</html>
"""

    mail.send(message)


# ============================================================
# SERIALIZER
# ============================================================

def employee_to_dict(employee):

    active_assignments = [
        assignment
        for assignment in employee.assignments
        if assignment.actual_return_date is None
    ]

    return {

        "id":
            employee.id,

        "employee_id":
            employee.employee_id,

        "name":
            employee.name,

        "email":
            employee.email,

        "phone":
            employee.phone,

        "department":
            employee.department,

        "designation":
            employee.designation,

        "cost_center":
            employee.cost_center,

        "joining_date":
            employee.joining_date.isoformat()
            if employee.joining_date
            else None,

        "status":
            employee.status,

        "assigned_asset_count":
            len(active_assignments),

        "email_verified":
            employee.email_verified,

        "must_change_password":
            employee.must_change_password,

        "created_at":
            employee.created_at.isoformat()
            if employee.created_at
            else None
    }