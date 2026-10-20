# Kaveri Member Club • Security & Compliance Architecture

This document details the security safeguards, cryptographic primitives, access control policies, and DPDP Act compliance controls implemented in **Kaveri Member Club**.

---

## 1. Password Hashing & Cryptography

- **Algorithm**: **Argon2id** (the winner of the Password Hashing Competition and the current gold standard).
- **Parameters**:
  - `time_cost`: 3 iterations
  - `memory_cost`: 65,536 KiB (64 MiB)
  - `parallelism`: 2 threads
  - `salt_len`: 16 bytes
  - `hash_len`: 32 bytes
- **Protection**: Immune to GPU/ASIC brute-force dictionary attacks.
- Plaintext passwords are never logged, never cached in memory longer than necessary, and never stored in persistent storage.

---

## 2. Secure Administrator Credential Handoff Protocol

### Initial Setup Procedure:
1. The first administrator account is initialized using the secure backend CLI tool on the server host:
   ```bash
   python -m app.cli create-admin <username> <optional_password>
   ```
2. If no password is provided in the command, a cryptographically secure 12-character random string is generated via `secrets.token_urlsafe()`.
3. The account is created with `must_change_password=True`.
4. **First Login Enforcement**: Upon signing in with the temporary password, the application forces the store owner to set a private, permanent password before granting access to dashboard metrics or member records.
5. **No Hardcoded Defaults**: There are no default administrative credentials (e.g. `admin/admin`) in source code or database migrations.

---

## 3. Session & Transport Security

- **Authentication Mechanism**: Server-managed JSON Web Tokens (JWT) using `HS256` signed by an unguessable 256-bit `SECRET_KEY`.
- **Cookies**: Transmitted via `Set-Cookie` with:
  - `HttpOnly`: Prevents client-side JavaScript / XSS theft.
  - `Secure`: Transmitted only over encrypted HTTPS in production.
  - `SameSite=Lax` or `Strict`: Protects against Cross-Site Request Forgery (CSRF).
- **Security Headers**:
  - `X-Frame-Options: DENY` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff` (prevents MIME confusion)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 4. Rate Limiting & Abuse Prevention

A sliding-window in-memory rate limiter protects sensitive public and administrative endpoints:
- `/api/v1/auth/login`: Maximum **5 requests per minute** per client IP. Prevents automated brute-force password guessing.
- `/api/v1/members/register`: Maximum **15 requests per minute** per client IP. Prevents automated bot registrations and counter clutter.
- Excess requests immediately receive `429 Too Many Requests`.

---

## 5. Role-Based Access Control (RBAC)

The system supports three administrative roles:

| Role | Permissions |
|---|---|
| **Owner** | Full privileges: View all customer records, adjust loyalty points, approve promotional campaigns, trigger emergency kill-switch, and inspect security audit logs. |
| **Manager** | View members, create & approve campaigns, queue jobs, adjust customer profiles. |
| **Staff** | Search members, verify in-store customer IDs, create draft campaigns. *Cannot approve or dispatch campaigns without manager/owner approval.* |

---

## 6. Digital Personal Data Protection (DPDP) Act Compliance

1. **Unbundled Voluntary Consent**:
   - Marketing consent checkboxes for WhatsApp and SMS are **unchecked by default**.
   - Registration does not require marketing agreement.
2. **Instant Opt-Out**:
   - A customer can opt out anytime via the self-service portal (`/#preferences`).
   - Opt-out takes effect immediately in the database.
3. **Pre-Send Verification**:
   - When a campaign is dispatched, the dispatcher queries real-time consent immediately prior to sending each individual message. If the customer opted out between campaign scheduling and execution, the message is automatically skipped (`skipped_opt_out`).
4. **Hard Suppression**:
   - Re-registration with the same mobile number does **NOT** revive previously withdrawn consent.
5. **No Guessable ID Access**:
   - The self-service preference portal requires matching **both** the Membership ID (`KAV-000001`) and the primary mobile number (`+919845123456`) before revealing customer preferences or data.
