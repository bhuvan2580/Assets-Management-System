from flask import current_app
from flask_mail import Message

from extensions import mail


def send_email(
    recipient,
    subject,
    html
):
    """
    Send an HTML email.
    """

    msg = Message(
        subject=subject,
        recipients=[recipient],
        html=html
    )

    mail.send(msg)


def send_temporary_password_email(
    user_name,
    recipient,
    role,
    temporary_password
):
    """
    Send the initial account credentials
    to a newly created user.
    """

    subject = "Your Abylle Solutions Account"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">
    </head>

    <body style="
        margin:0;
        padding:0;
        background:#f4f6f8;
        font-family:Arial, Helvetica, sans-serif;
    ">

        <div style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 4px 20px rgba(0,0,0,0.08);
        ">

            <!-- HEADER -->

            <div style="
                background:#111827;
                padding:28px;
                text-align:center;
            ">

                <h1 style="
                    color:#ffffff;
                    margin:0;
                    font-size:24px;
                ">
                    Abylle Solutions
                </h1>

                <p style="
                    color:#d1d5db;
                    margin:8px 0 0;
                    font-size:14px;
                ">
                    IT Asset Management
                </p>

            </div>


            <!-- CONTENT -->

            <div style="
                padding:35px;
                color:#1f2937;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:22px;
                ">
                    Welcome, {user_name}!
                </h2>

                <p style="
                    font-size:15px;
                    line-height:1.6;
                    color:#4b5563;
                ">
                    Your Abylle Solutions account has been
                    created successfully.
                </p>

                <div style="
                    background:#f9fafb;
                    border:1px solid #e5e7eb;
                    border-radius:10px;
                    padding:20px;
                    margin:25px 0;
                ">

                    <p style="margin:0 0 10px;">
                        <strong>Role:</strong> {role}
                    </p>

                    <p style="margin:0;">
                        <strong>Temporary Password:</strong>
                    </p>

                    <div style="
                        background:#111827;
                        color:#ffffff;
                        padding:14px;
                        border-radius:7px;
                        margin-top:8px;
                        font-family:monospace;
                        font-size:16px;
                        text-align:center;
                        letter-spacing:1px;
                    ">
                        {temporary_password}
                    </div>

                </div>

                <div style="
                    background:#fff7ed;
                    border-left:4px solid #f97316;
                    padding:15px;
                    margin:20px 0;
                ">

                    <strong>Important security notice</strong>

                    <p style="
                        margin:7px 0 0;
                        color:#6b7280;
                        font-size:14px;
                        line-height:1.5;
                    ">
                        This is a temporary password.
                        You will be required to change it
                        before accessing the system.
                    </p>

                </div>

                <p style="
                    font-size:14px;
                    color:#6b7280;
                    line-height:1.5;
                ">
                    If you did not expect this account,
                    please contact the IT team immediately.
                </p>

            </div>


            <!-- FOOTER -->

            <div style="
                background:#f9fafb;
                padding:20px;
                text-align:center;
                border-top:1px solid #e5e7eb;
            ">

                <p style="
                    margin:0;
                    color:#9ca3af;
                    font-size:12px;
                ">
                    © Abylle Solutions
                </p>

                <p style="
                    margin:6px 0 0;
                    color:#9ca3af;
                    font-size:12px;
                ">
                    This is an automated email.
                    Please do not reply.
                </p>

            </div>

        </div>

    </body>
    </html>
    """

    send_email(
        recipient=recipient,
        subject=subject,
        html=html
    )