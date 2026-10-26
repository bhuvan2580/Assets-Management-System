# Abylle Solutions — IT Asset Management System

## Deployment, Setup, Database Migration & PWA Guide

> **Purpose:** A practical guide for transferring the application to
> another Windows laptop, configuring PostgreSQL and application
> secrets, running the Flask and React/Vite services, and
> building/testing the Progressive Web App (PWA).

This guide preserves the original deployment and migration workflow,
including PostgreSQL backup/restore, Python and Node.js setup, the
Rollup WASM workaround, PWA verification, troubleshooting checks, and
deployment checklists.

## Contents

- [1. What to copy to the new laptop](#1-what-to-copy-to-the-new-laptop)
- [2. Software required on the new
  laptop](#2-software-required-on-the-new-laptop)
- [3–7. PostgreSQL migration](#3-postgresql-database-migration)
- [8–12. Backend setup and configuration](#8-backend-setup)
- [13–16. Frontend setup and startup](#13-frontend-setup)
- [17–20. Testing and PWA build](#17-test-the-application)
- [21–24. Daily startup and transfer
  checklist](#21-daily-development-startup)
- [25. Security and secret-key generation](#25-security)
- [26–28. Final checklists and deployment flow](#26-complete-checklist)

------------------------------------------------------------------------

## 1. What to copy to the new laptop

Copy the project source folder to the pen drive and then to the new
laptop.

Recommended structure:

``` text

Assets management/

├── backend/

│   ├── app.py

│   ├── extensions.py

│   ├── models/

│   ├── routes/

│   ├── requirements.txt

│   └── ...

│

└── frontend/

    ├── src/

    ├── public/

    ├── package.json

    ├── package-lock.json

    ├── vite.config.js

    ├── index.html

    └── ...
```

### Do NOT copy these

Do not copy:

``` text

backend/.venv/

frontend/node_modules/

frontend/dist/
```

These are recreated on the new laptop.

Keep:

``` text

backend/requirements.txt

frontend/package.json

frontend/package-lock.json
```

------------------------------------------------------------------------

# 2. Software required on the new laptop

Install:

1.  Python

2.  Node.js

3.  npm (installed with Node.js)

4.  PostgreSQL

5.  Git (optional)

Verify:

``` powershell

python --version

pip --version

node --version

npm --version

psql --version
```

Each command should return a version.

------------------------------------------------------------------------

# 3. PostgreSQL database migration

The application uses PostgreSQL for persistent application data.

The recommended migration method is (use this when you need to transfer
existing records):

``` text

Old laptop

    ↓

pg_dump

    ↓

Database backup

    ↓

Pen drive

    ↓

New laptop

    ↓

pg_restore
```

## 3.1 Create a backup on the OLD laptop

Find the actual database name first.

Then run:

``` powershell

pg_dump -U postgres -d asset_management -F c -f asset_management_backup.dump
```

Replace `asset_management` with your actual database name if different.

Enter the PostgreSQL password when prompted.

Copy:

``` text

asset_management_backup.dump
```

to the pen drive.

### Alternative: plain SQL backup

You can also create:

``` powershell

pg_dump -U postgres -d asset_management -f asset_management_backup.sql
```

Restore this format with `psql` rather than `pg_restore`.

------------------------------------------------------------------------

# 4. Install PostgreSQL on the NEW laptop

Install PostgreSQL.

Remember:

- PostgreSQL username

- PostgreSQL password

- PostgreSQL port

The default port is normally:

``` text

5432
```

Verify:

``` powershell

psql -U postgres
```

Enter the password.

Exit:

``` sql

\q
```

------------------------------------------------------------------------

# 5. Create the application database

Open PostgreSQL:

``` powershell

psql -U postgres
```

Create the database:

``` sql

CREATE DATABASE asset_management;
```

If the old project uses another database name, use that name instead.

Exit:

``` sql

\q
```

------------------------------------------------------------------------

# 6. Restore the database

Copy the backup file from the pen drive to the new laptop.

For a custom-format `.dump` backup:

``` powershell

pg_restore -U postgres -d asset_management -v asset_management_backup.dump
```

For a plain `.sql` backup:

``` powershell

psql -U postgres -d asset_management -f asset_management_backup.sql
```

------------------------------------------------------------------------

# 7. Verify the database

Connect:

``` powershell

psql -U postgres -d asset_management
```

List tables:

``` sql

\dt
```

Verify that the application tables are present, including the relevant
asset, employee, vendor, and assignment tables.

Exit:

``` sql

\q
```

------------------------------------------------------------------------

# 8. Backend setup

Open PowerShell and navigate to the backend.

Example:

``` powershell

cd "C:\Users\\\<USERNAME>\Downloads\Assets management\backend"
```

Use the actual path on the new laptop.

## 8.1 Create the Python virtual environment

``` powershell

python -m venv .venv
```

Activate it:

``` powershell

.\.venv\Scripts\Activate.ps1
```

You should see:

``` text

(.venv)
```

at the beginning of the terminal.

If PowerShell blocks activation, use Command Prompt:

``` cmd

.venv\Scripts\activate
```

------------------------------------------------------------------------

# 9. Install backend requirements

Make sure `requirements.txt` is present.

Run:

``` powershell

pip install -r requirements.txt
```

Do not manually install packages that are already listed in
`requirements.txt`.

Verify:

``` powershell

pip list
```

------------------------------------------------------------------------

# 10. Configure the PostgreSQL connection

The Flask backend needs the PostgreSQL connection string.

Typical format:

``` text

postgresql://postgres:PASSWORD@localhost:5432/asset_management
```

If the project uses a `.env` file, configure the variable used by the
project, for example:

``` env

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/asset_management
```

Use the actual database name, username, password, and port.

Do not publish the real password.

****Important:**** use the environment-variable name already referenced
by your backend code. Do not invent a different variable name if the
project already has one.

------------------------------------------------------------------------

# 11. Start the backend

From the backend directory, with `.venv` activated:

``` powershell

python app.py
```

If your project has a different startup command, use that command.

The backend should start on its configured address, commonly:

``` text

http\://127.0.0.1:5000
```

Keep this terminal open.

------------------------------------------------------------------------

# 12. Test the backend

Open the backend address in a browser or test it through the frontend.

If the backend cannot connect to PostgreSQL, check:

1.  PostgreSQL is running.

2.  Database name is correct.

3.  Username is correct.

4.  Password is correct.

5.  Port is correct.

6.  The backend database URL is correct.

------------------------------------------------------------------------

# 13. Frontend setup

Open a SECOND PowerShell window.

Navigate to:

``` powershell

cd "C:\Users\\\<USERNAME>\Downloads\Assets management\frontend"
```

Do not copy `node_modules` from the old laptop.

Install dependencies:

``` powershell

npm install
```

Because `package-lock.json` is included, npm can recreate the dependency
tree.

------------------------------------------------------------------------

# 14. PWA / Rollup configuration

This project uses:

- Vite

- React

- `vite-plugin-pwa`

- Workbox

- Rollup

The original Windows environment blocked Rollup's native `.node` binary
through an Application Control policy.

The project therefore uses:

``` text

@rollup/wasm-node
```

and a `package.json` override similar to:

``` json

"overrides": {

  "rollup": "npm:@rollup/wasm-node@4.63.6"

}
```

Do not remove this if the new machine requires the same workaround.

After:

``` powershell

npm install
```

check:

``` powershell

npm ls rollup
```

The current setup should show something similar to:

``` text

rollup@npm:@rollup/wasm-node@4.63.6
```

Also check:

``` powershell

npm ls @rollup/wasm-node
```

------------------------------------------------------------------------

# 15. Configure the frontend API URL

The React frontend must point to the Flask backend.

Check the existing project configuration/source for the API base URL.

For local development it may be:

``` text

http\://127.0.0.1:5000
```

or:

``` text

http\://localhost:5000
```

If the project uses a frontend `.env` file, configure the existing
variable used by the source code, for example:

``` env

VITE_API_URL=http\://127.0.0.1:5000
```

Do not create a new variable name unless the frontend code is changed to
use it.

------------------------------------------------------------------------

# 16. Run the frontend

From the frontend directory:

``` powershell

npm run dev
```

Vite will normally show something similar to:

``` text

Local: http\://localhost:5173/
```

Open that URL in Chrome.

The normal local setup is:

``` text

Frontend:

http\://localhost:5173

Backend:

http\://127.0.0.1:5000
```

------------------------------------------------------------------------

# 17. Test the application

Before creating the production PWA build, verify:

- Dashboard

- Assets

- Employees

- Vendors

- Assignments

- Asset creation

- Asset editing

- Asset deletion restrictions

- Employee creation

- Employee editing

- Employee deletion restrictions

- Asset assignment

- Asset return

- Search

- Filtering

- Modals

- Date validation

- Employee/asset assignment information

- PostgreSQL persistence

Also verify that the old database records are visible.

------------------------------------------------------------------------

# 18. Build the PWA

After the development version works:

``` powershell

npm run build
```

A successful build should create:

``` text

dist/

├── index.html

├── manifest.webmanifest

├── registerSW.js

├── sw.js

├── workbox-*.js

└── assets/
```

Hashed JS/CSS filenames can be different.

A successful PWA build should contain output similar to:

``` text

PWA

mode      generateSW

precache  ...

files generated

  dist/sw.js

  dist/workbox-....js
```

------------------------------------------------------------------------

# 19. Test the production PWA locally

Run:

``` powershell

npm run preview
```

Vite will display a URL, normally similar to:

``` text

http\://localhost:4173/
```

Open it in Chrome.

Then check:

``` text

Chrome DevTools

→ Application

→ Manifest
```

Verify the manifest.

Then:

``` text

Application

→ Service Workers
```

Verify that:

``` text

sw.js
```

is registered.

Chrome should provide an install option when the PWA requirements are
satisfied.

------------------------------------------------------------------------

# 20. PWA icons

The project should contain its configured PWA icons, commonly:

``` text

public/

├── pwa-192x192.png

└── pwa-512x512.png
```

The manifest should reference the correct files.

Make sure these files are copied with the source project.

------------------------------------------------------------------------

# 21. Daily development startup

You normally need two terminals.

### Terminal 1: Backend

``` powershell

cd "C:\Users\\\<USERNAME>\Downloads\Assets management\backend"

.\.venv\Scripts\Activate.ps1

python app.py
```

### Terminal 2: Frontend

``` powershell

cd "C:\Users\\\<USERNAME>\Downloads\Assets management\frontend"

npm run dev
```

Then open the Vite URL.

------------------------------------------------------------------------

# 22. PostgreSQL must be running

If the application cannot connect to PostgreSQL, check the PostgreSQL
Windows service.

The service name depends on the installed PostgreSQL version and may
look similar to:

``` text

postgresql-x64-18
```

Do not assume the exact version/service name.

------------------------------------------------------------------------

# 23. What should be on the pen drive

Recommended deployment folder:

``` text

Assets Management Deployment/

│

├── Asset Management/

│   ├── backend/

│   └── frontend/

│

├── database/

│   └── asset_management_backup.dump

│

└── README.md
```

Keep the database backup separate from the source code.

------------------------------------------------------------------------

# 24. What NOT to put on the pen drive

Do not transfer:

``` text

backend/.venv/

frontend/node_modules/

frontend/dist/
```

They contain generated/platform-specific files and can be recreated.

Do transfer:

``` text

backend/requirements.txt

frontend/package.json

frontend/package-lock.json

frontend/vite.config.js

frontend/public/

frontend/src/
```

and all other actual source/configuration files required by the project.

------------------------------------------------------------------------

# 25. Security and secret-key generation

Treat the `.env` file and all credentials as private configuration. Do
not commit real secrets to Git, include them in screenshots, send them
in chat, or leave them in a public/shared folder.

## 25.1 Generate strong application secrets

Use the Python environment for this project (or any trusted Python
installation) to generate a cryptographically random secret. From
PowerShell, run:

``` powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

This prints a 64-character hexadecimal value backed by 32 random bytes.
Run the command **twice** to create two independent values.

Configure the existing variable names your backend actually reads. A
typical `.env` configuration looks like this:

``` env
SECRET_KEY=paste_the_first_generated_value_here
JWT_SECRET_KEY=paste_the_second_generated_value_here
```

- `SECRET_KEY` is commonly used by Flask for signing session cookies and
  other Flask features that rely on the application secret.
- `JWT_SECRET_KEY` is commonly used to sign and verify JWT
  authentication tokens.
- Keep the two values different. **Never use the example placeholders
  literally.**
- The names above are examples: check `app.py`, your configuration
  module, and JWT setup to confirm the exact variable names used by this
  project. Do not create a new variable name unless the code is
  configured to read it.

## 25.2 Configure `.env` safely

1.  Create or update the backend `.env` file on the target laptop.
2.  Add the database connection variable and the secret variables using
    the exact names expected by the code.
3.  Confirm the application loads `.env` (for example, through its
    existing `python-dotenv` or configuration setup).
4.  Ensure `.env` is ignored by Git. Add this line to the appropriate
    `.gitignore` if it is not already present:

``` gitignore
.env
```

5.  Keep a separate, secure record of production credentials if your
    organization requires one. Do not put actual secret values in this
    README.

Example configuration with placeholders only:

``` env
DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/asset_management
SECRET_KEY=YOUR_FIRST_GENERATED_SECRET
JWT_SECRET_KEY=YOUR_SECOND_GENERATED_SECRET
```

Use the actual database name, username, password, and port. If the
project uses a different database environment variable, preserve the
name already referenced in the backend code.

## 25.3 What happens if a secret changes?

- Changing `JWT_SECRET_KEY` generally invalidates existing JWTs; users
  may need to sign in again.
- Changing Flask's `SECRET_KEY` can invalidate existing signed session
  cookies and other data signed with the old key.
- If the application has multiple backend instances, all instances that
  need to validate the same tokens must use the same configured JWT
  secret.
- Do not rotate secrets casually on a live system. Plan the change,
  restart the backend, and test login and session behavior afterward.

## 25.4 General security checklist

- Do not put real passwords directly into source code.
- Do not publicly share `.env`, database passwords, API secrets, private
  keys, or JWT/Flask secrets.
- Do not commit `.env` to source control.
- Use separate, randomly generated `SECRET_KEY` and `JWT_SECRET_KEY`
  values when the application uses both.
- Keep credentials on the target laptop's environment/configuration.
- If a secret is exposed, generate a replacement and update the
  application configuration promptly.

------------------------------------------------------------------------

# 26. Complete checklist

## Software

- [ ] Python installed

- [ ] Node.js installed

- [ ] npm working

- [ ] PostgreSQL installed

- [ ] PostgreSQL password available

- [ ] PostgreSQL service running

## Project

- [ ] Source copied

- [ ] Backend `.venv` recreated

- [ ] `pip install -r requirements.txt` completed

- [ ] Frontend `npm install` completed

- [ ] PWA dependencies installed

## Database

- [ ] Database created

- [ ] Backup restored

- [ ] `\dt` shows tables

- [ ] Assets visible

- [ ] Employees visible

- [ ] Vendors visible

- [ ] Assignments visible

## Backend

- [ ] Database URL configured

- [ ] Flask starts

- [ ] PostgreSQL connection succeeds

- [ ] API responds

## Frontend

- [ ] API URL configured

- [ ] `npm run dev` works

- [ ] Dashboard works

- [ ] Assets work

- [ ] Employees work

- [ ] Vendors work

- [ ] Assignments work

## PWA

- [ ] `npm run build` succeeds

- [ ] `manifest.webmanifest` generated

- [ ] `sw.js` generated

- [ ] Workbox file generated

- [ ] Manifest visible in Chrome

- [ ] Service worker registered

- [ ] Install option available

------------------------------------------------------------------------

# 27. Quick setup sequence

## Old laptop

Create the database backup:

``` powershell

pg_dump -U postgres -d asset_management -F c -f asset_management_backup.dump
```

Copy the source project and backup to the pen drive.

## New laptop

Install:

``` text

Python

Node.js

PostgreSQL
```

Create database:

``` powershell

psql -U postgres
```

``` sql

CREATE DATABASE asset_management;
```

Restore:

``` powershell

pg_restore -U postgres -d asset_management asset_management_backup.dump
```

Backend:

``` powershell

cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

python app.py
```

Frontend in a second terminal:

``` powershell

cd frontend

npm install

npm run dev
```

After testing:

``` powershell

npm run build

npm run preview
```

------------------------------------------------------------------------

# 28. Final deployment flow

``` text

OLD LAPTOP

    │

    ├── Copy source code

    ├── Export PostgreSQL database

    │

    ▼

PEN DRIVE

    │

    ├── Project source

    ├── Database backup

    └── README.md

    │

    ▼

NEW LAPTOP

    │

    ├── Install Python

    ├── Install Node.js

    ├── Install PostgreSQL

    │

    ├── Restore PostgreSQL database

    │

    ├── Create Python .venv

    ├── Install requirements

    │

    ├── npm install

    ├── Configure backend database URL

    ├── Configure frontend API URL

    │

    ├── Start Flask

    ├── Start React/Vite

    │

    └── npm run build

             │

             ▼

        PWA READY
```

## Important

This guide uses the current project setup discussed during development.
Where this README says to use an existing variable, database name, path,
or startup command, use the actual value already present in the project
rather than creating a new one.
