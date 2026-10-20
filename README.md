# Kaveri Member Club
### Customer Loyalty, DPDP Consent & Promotional Campaign Management System
**For**: Kaveri Electronic Halaguru  
**Location**: HMS Complex, Kanakapura Main Road, Halaguru Hobli, Karnataka - 571421, India  
**Store Hours**: Monday – Sunday, 9:30 AM to 9:00 PM IST • **Support**: +91 94481 23456

---

## 1. System Overview

**Kaveri Member Club** is a complete, production-grade loyalty membership and customer communication system engineered specifically for **Kaveri Electronic Halaguru**. The platform bridges in-store electronics retail with modern, privacy-respecting digital engagement.

### Core Capabilities:
- **Instant Digital Registration**: Mobile-first registration optimized for QR codes displayed on store counters.
- **Concurrency-Safe Membership IDs**: Automatically issues zero-padded sequential IDs (`KAV-000001`, `KAV-000002`) with collision prevention under high concurrent load.
- **Digital Membership Card**: High-contrast, royal blue and gold digital card with an embedded dynamic verification QR code and print/PDF support.
- **DPDP Act, 2023 Auditable Consent**: Fully unbundled, voluntary opt-in checkboxes for WhatsApp and SMS marketing (unchecked by default).
- **Instant Customer Opt-Out**: Self-service Customer Preference Portal (`/#preferences`) where members verify identity and can instantly withdraw marketing consent.
- **Pre-Send Verification**: Real-time pre-send consent validation ensuring that even if a campaign was scheduled in advance, any customer who opted out in the interim is automatically skipped.
- **Promotional Campaign Builder**: Multi-channel campaign creator (Festival offers, discounts, new arrivals, member-only perks) with real-time audience size estimation, preview mode, and emergency kill-switch cancellation.
- **Legitimate Gateway Integration**: Direct architecture for Meta WhatsApp Business Cloud API and Indian TRAI DLT SMS gateways with safe, transparent dry-run fallback when unconfigured.
- **Executive Admin Dashboard**: Role-Based Access Control (`owner`, `manager`, `staff`), metrics overview, customer directory search, and security audit trail.

---

## 2. Technology Stack

- **Backend**: Python 3.12+ / FastAPI, Pydantic v2
- **ORM & Migrations**: SQLAlchemy 2.0 (Async) + Alembic
- **Database**: PostgreSQL 16 (Production / Docker) & SQLite `aiosqlite` (Zero-setup local development & testing)
- **Password Hashing**: Argon2id (`argon2-cffi`)
- **Authentication**: Secure HttpOnly cookies + JWT session management, sliding-window rate limiting
- **Frontend**: React 18 / 19 + TypeScript + Vite + Tailwind CSS
- **Containerization**: Docker & Docker Compose

---

## 3. Local Development Quickstart

### Prerequisites:
- Python 3.12+
- Node.js 18+ and npm

### A. Backend Setup (Windows PowerShell / Linux):
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (or auto-created on start)
python -m app.cli create-admin kaveri_owner OwnerSecurePass123!
python -m app.cli seed-demo

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/docs`

### B. Frontend Setup:
```bash
# Navigate to frontend (in a separate terminal)
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Running Automated Tests

The backend includes a comprehensive Pytest test suite covering all 18+ critical system requirements:

```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

### Verified Test Cases:
1. `test_successful_registration`: Complete registration, Indian phone normalization (`+91`), sequential ID generation, and welcome loyalty points.
2. `test_duplicate_phone_prevention`: Duplicate primary mobile numbers rejected with 409 Conflict.
3. `test_invalid_input_validation`: Rejection of malformed phone numbers and missing privacy notice agreements.
4. `test_unbundled_marketing_consent`: Confirms marketing consent is voluntary and unchecked by default.
5. `test_concurrent_id_generation`: Concurrency-safe sequential ID generation without collisions.
6. `test_customer_verification_and_preferences`: Secure verification requiring Member ID + matching Phone.
7. `test_instant_opt_out_and_audit_trail`: Instant DPDP consent withdrawal and audit trail persistence.
8. `test_account_closure_withdraws_all_consents`: Member closure immediately terminates all marketing channels.
9. `test_campaign_creation_and_preview`: Campaign builder audience estimation.
10. `test_pre_send_consent_withdrawal_skips_message`: Pre-send verification skips opted-out members from scheduled dispatches.
11. `test_campaign_kill_switch_cancellation`: Emergency kill-switch aborts scheduled jobs.
12. `test_admin_login_and_cookie`: Secure login with Argon2id and HttpOnly session cookies.
13. `test_invalid_login_rejection`: Unauthenticated access rejection (401).
14. `test_role_based_access_control`: RBAC boundaries (Staff blocked from campaign approval).
15. `test_security_headers_present`: Verifies `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, etc.
16. `test_login_rate_limiting`: Sliding-window brute force protection (429 Too Many Requests).
17. `test_messaging_unconfigured_dry_run_mode`: Safe dry-run mode when WhatsApp/SMS credentials are omitted.
18. `test_whatsapp_webhook_verification`: Meta webhook handshake verification.
19. `test_whatsapp_delivery_webhook_callback`: Delivery callback updates job status to delivered.

---

## 5. Production Docker Compose Deployment

To deploy the entire production stack (PostgreSQL + FastAPI + Worker + Nginx Frontend):

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Configure production secrets in .env
# Edit SECRET_KEY, POSTGRES_PASSWORD, etc.

# 3. Launch Docker Compose
docker compose up -d --build

# 4. Initialize first admin account
docker exec -it kaveri_backend python -m app.cli create-admin
```

---

## 6. Database Backups & Disaster Recovery

### Creating a Backup:
```bash
# Linux:
./scripts/backup_db.sh

# Windows:
powershell -ExecutionPolicy Bypass -File .\scripts\backup_db.ps1
```

### Restoring from Backup:
```bash
# Linux:
./scripts/restore_db.sh /var/backups/kaveri_member_club/kaveri_db_backup_XXXX.sql.gz

# Windows:
powershell -ExecutionPolicy Bypass -File .\scripts\restore_db.ps1 -BackupFile .\backups\kaveri_sqlite_XXXX.db
```
