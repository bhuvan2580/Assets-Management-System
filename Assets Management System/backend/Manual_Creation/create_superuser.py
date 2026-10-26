from getpass import getpass
from werkzeug.security import generate_password_hash
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import app
from extensions import db
from models.user import User
from services.email_service import send_email


def create_superuser():

    with app.app_context():

        # Check if a superuser already exists
        existing = (
            User.query
            .filter_by(role="SUPERUSER")
            .first()
        )

        if existing:
            print(
                f"SUPERUSER already exists: "
                f"{existing.email}"
            )
            return

        print("\n=== Create Initial SUPERUSER ===\n")

        name = input("Name: ").strip()
        email = input("Email: ").strip().lower()

        while not name:
            print("Name cannot be empty.")
            name = input("Name: ").strip()

        while not email:
            print("Email cannot be empty.")
            email = input("Email: ").strip().lower()

        password = getpass(
            "Password: "
        )

        confirm_password = getpass(
            "Confirm password: "
        )

        if password != confirm_password:
            print("\nPasswords do not match.")
            return

        if len(password) < 12:
            print(
                "\nPassword must contain at least "
                "12 characters."
            )
            return

        existing_email = (
            User.query
            .filter_by(email=email)
            .first()
        )

        if existing_email:
            print(
                "\nAn account with this email "
                "already exists."
            )
            return

        user = User(
            name=name,
            email=email,

            password_hash=generate_password_hash(
                password,
                method="scrypt"
            ),

            role="SUPERUSER",

            employee_id=None,

            is_active=True,

            # We are creating this account manually,
            # so email verification is not required yet.
            email_verified=True,

            # Since this is the initial account and
            # we already selected the permanent password,
            # don't force a password change.
            must_change_password=False,

            failed_login_attempts=0,

            locked_until=None,

            last_login=None,
        )

        db.session.add(user)
        db.session.commit()

        print("\nSuperuser created successfully.")

        try:
            send_superuser_welcome_email(user)
            print(f"Welcome email sent successfully to {user.email}")
        except Exception as exc:
            print(f"Superuser was created, but the welcome email could not be sent: {exc}")

        print(
            "\n================================"
        )
        print(
            "SUPERUSER CREATED SUCCESSFULLY"
        )
        print(
            "================================"
        )
        print(f"Name : {user.name}")
        print(f"Email: {user.email}")
        print(f"Role : {user.role}")
        print(
            "================================\n"
        )
        
def send_superuser_welcome_email(user):
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:600px; margin:30px auto; background:#ffffff;
                    border-radius:12px; overflow:hidden;
                    border:1px solid #e5e7eb;">

            <div style="background:#111827; padding:28px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                    Abylle Solutions
                </h1>
                <p style="color:#d1d5db; margin:8px 0 0;">
                    IT Asset Management System
                </p>
            </div>

            <div style="padding:32px; color:#374151;">
                <h2 style="color:#111827; margin-top:0;">
                    Welcome, {user.name}!
                </h2>

                <p>
                    Your Superuser account for the Abylle Solutions
                    IT Asset Management System has been created successfully.
                </p>

                <div style="background:#f9fafb; border:1px solid #e5e7eb;
                            border-radius:8px; padding:18px; margin:24px 0;">
                    <p style="margin:0 0 12px;">
                        <strong>Name:</strong> {user.name}
                    </p>
                    <p style="margin:0 0 12px;">
                        <strong>Email:</strong> {user.email}
                    </p>
                    <p style="margin:0;">
                        <strong>Access level:</strong> Superuser
                    </p>
                </div>

                <p>
                    You can now sign in using the email address and password
                    you selected during account creation.
                </p>

                <p>
                    For your security, never share your password with anyone.
                </p>

                <p style="margin-top:28px;">
                    Regards,<br>
                    <strong>Abylle Solutions IT Team</strong>
                </p>
            </div>

            <div style="background:#f9fafb; padding:16px; text-align:center;
                        color:#9ca3af; font-size:12px;">
                &copy; {__import__('datetime').datetime.now().year}
                Abylle Solutions. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    send_email(
        recipient=user.email,
        subject="Welcome to Abylle Solutions - Superuser Account Created",
        html=html
    )



if __name__ == "__main__":
    create_superuser()