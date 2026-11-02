# Blood Donation Backend (Java + Spring Boot)

A starter backend for a blood donation website. It includes signup, signin, logout, profile read/update, MySQL persistence, BCrypt password hashing, request validation, and session-based Spring Security.

## Requirements
- Java 17+
- Maven 3.9+
- MySQL 8+

## 1. Create database / configure credentials
The default JDBC URL creates the database automatically if the MySQL account has permission. Otherwise run:

```sql
CREATE DATABASE blood_donation;
```

Set environment variables before starting:
- `DB_USERNAME` — MySQL username
- `DB_PASSWORD` — MySQL password
- `DB_URL` — optional JDBC URL
- `COOKIE_SECURE=true` in HTTPS production deployments

Do not commit database credentials to Git.

## 2. Run locally
From this folder:

```bash
mvn spring-boot:run
```

Base URL: `http://localhost:8080`

## 3. API routes

| Method | Route | Auth required | Purpose |
|---|---|---:|---|
| GET | `/api/auth/csrf` | No | Get CSRF token before POST/PUT requests |
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/signin` | No | Authenticate and create session |
| POST | `/api/auth/logout` | Yes in normal use | Invalidate session |
| GET | `/api/profile` | Yes | Get current user's profile |
| PUT | `/api/profile` | Yes | Update profile |

Spring Security CSRF protection is intentionally enabled. Before POST/PUT requests, call `GET /api/auth/csrf`, retain cookies, and send the returned `token` in the `X-XSRF-TOKEN` header. The browser must retain cookies between calls. For a separate frontend origin, configure exact CORS origins and credentials explicitly; do not use wildcard origins with credentials.

## 4. Signup JSON example

```json
{
  "firstName": "Rahul",
  "middleName": "Kumar",
  "lastName": "Sharma",
  "fatherName": "Amit Sharma",
  "motherName": "Sunita Sharma",
  "email": "rahul@example.com",
  "mobileNumber": "9876543210",
  "dateOfBirth": "2004-05-12",
  "bloodGroup": "O_POSITIVE",
  "gender": "MALE",
  "medicalConditions": "None declared",
  "password": "ExamplePassword123",
  "consentAccepted": true
}
```

Allowed blood group values: `A_POSITIVE`, `A_NEGATIVE`, `B_POSITIVE`, `B_NEGATIVE`, `AB_POSITIVE`, `AB_NEGATIVE`, `O_POSITIVE`, `O_NEGATIVE`.

Allowed gender values: `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`.

## 5. Sign-in JSON

```json
{
  "email": "rahul@example.com",
  "password": "ExamplePassword123"
}
```

## Important security/production notes
- This is a functional starter project, not a security-audited production deployment.
- Medical details are sensitive. Collect only what is necessary, explain why it is collected, restrict staff access, and define retention/deletion practices.
- The consent checkbox should link to a clear privacy notice. A checkbox is not a substitute for applicable legal/privacy requirements.
- Donor eligibility must be assessed by an appropriate medical screening process; this app does not determine eligibility.
- Add email/OTP verification, password reset, rate limiting, audit logging, monitoring, and schema migrations before public launch.
- For a frontend on a different origin, add an explicit CORS configuration for your exact frontend URL and credentials. Keep CSRF enabled for cookie-based sessions.
- `spring.jpa.hibernate.ddl-auto=update` is for local development; use versioned database migrations in production.
