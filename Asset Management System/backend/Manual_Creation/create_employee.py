"""
Create an employee from the terminal without sending any email.

Place this file in the backend project root, next to app.py.
Run from the backend directory with the project's virtual environment:
    .\.venv\Scripts\python.exe add_employee.py
"""

import secrets
import string
import traceback
from datetime import datetime

from werkzeug.security import generate_password_hash

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import app
from extensions import db
from models.employee import Employee

def prompt_required(label):
    while True:
        value = input(f"{label}: ").strip()
        if value:
            return value
        print(f"{label} is required.")


def prompt_optional(label):
    value = input(f"{label} (optional, press Enter to skip): ").strip()
    return value or None


def prompt_date():
    while True:
        value = input(
            "Joining date YYYY-MM-DD (optional, press Enter to skip): "
        ).strip()
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            print("Invalid date. Enter the date in YYYY-MM-DD format.")


def prompt_status():
    while True:
        value = input("Status [ACTIVE/INACTIVE] (default ACTIVE): ").strip().upper()
        if not value:
            return "ACTIVE"
        if value in {"ACTIVE", "INACTIVE"}:
            return value
        print("Enter ACTIVE or INACTIVE.")


def generate_initial_password(length=16):
    """Generate a random password containing upper/lowercase letters, digits and symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#$%*-_"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%*-_" for c in password)
        ):
            return password


def main():
    print("\n=== Add Employee (no email will be sent) ===\n")

    employee_id = prompt_required("Employee ID")
    name = prompt_required("Full name")
    email = prompt_required("Work email").lower()

    if not email.endswith("@abylle.com"):
        print("Error: only @abylle.com email addresses are allowed.")
        return

    phone = prompt_optional("Phone")
    department = prompt_optional("Department")
    designation = prompt_optional("Designation")
    cost_center = prompt_optional("Cost center")
    joining_date = prompt_date()

    with app.app_context():
        try:
            if Employee.query.filter_by(employee_id=employee_id).first():
                print(f"Error: employee ID '{employee_id}' already exists.")
                return

            if Employee.query.filter_by(email=email).first():
                print(f"Error: employee email '{email}' already exists.")
                return

            # Generate a new random password for this employee.
            # No email is sent; securely record/share this password with the employee.
            initial_password = generate_initial_password()
            password_hash = generate_password_hash(initial_password, method="scrypt")

            employee = Employee(
                employee_id=employee_id,
                name=name,
                email=email,
                phone=phone,
                department=department,
                designation=designation,
                cost_center=cost_center,
                joining_date=joining_date,
                status="ACTIVE",
                password_hash=password_hash,
                must_change_password=True,
                email_verified=False,
                failed_login_attempts=0,
                locked_until=None,
                last_login=None,
                password_reset_otp_hash=None,
                password_reset_expires_at=None,
                password_reset_attempts=0,
            )

            print("\nConnecting to the database and saving employee...")
            db.session.add(employee)
            db.session.commit()

            print("\nEmployee created successfully.")
            print(f"Database ID : {employee.id}")
            print(f"Employee ID : {employee.employee_id}")
            print(f"Name        : {employee.name}")
            print(f"Email       : {employee.email}")
            print(f"Department  : {employee.department or '-'}")
            print(f"Designation : {employee.designation or '-'}")
            print(f"Status      : {employee.status}")
            print(f"Must change password: {employee.must_change_password}")
            print("Email sent  : No")
            print("\nIMPORTANT — copy and securely share this initial password:")
            print(initial_password)
            print("It will not be emailed, and this script does not store it in plaintext.")

        except Exception as exc:
            db.session.rollback()
            print("\nFAILED TO CREATE EMPLOYEE")
            print(f"Error type: {type(exc).__name__}")
            print(f"Error details: {exc}")
            print("\nFull traceback for debugging:")
            traceback.print_exc()
        finally:
            db.session.remove()


if __name__ == "__main__":
    main()