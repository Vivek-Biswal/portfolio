# Private portfolio workspace

Open `/admin/login/` directly. There is no login link on public pages.
Local URL: http://127.0.0.1:5173/admin/login/
After deployment: https://YOUR-DOMAIN/admin/login/

## Your first login

1. Enter `vivekbiswal.dev@gmail.com` and click **Forgot your password?**.
2. Open the Firebase reset email and choose your own password of at least 12 characters.
3. Sign in. The website sends an email verification link if your email is unverified.
4. Verify your email, then sign in again.
5. Add the displayed setup key to Google Authenticator, Apple Passwords or another TOTP authenticator. Keep that key private.
6. Enter the six-digit code to finish enrollment, then sign in again with password and authenticator code.

You will arrive at `/admin/`. Passwords and authenticator keys are never needed in chat.

## Editing and publishing

Edit Profile, About, Contact, Skills, Projects, Notes, Now or Website settings.
**Save draft** preserves your changes without changing public pages. Save before opening a preview.
**Publish** updates the single published Firestore document used by all three worlds.
New page requests show the publication immediately; already-open interactive worlds refresh within 30 seconds or when refocused.
The script-free 1D page shows updates on its next reload.
History can restore a previous publication. Concurrent draft changes are rejected rather than overwritten.
The downloadable text profile and contact card also use published content.

## Setup completed

- Firebase project: `vivek-biswal`; Standard Firestore in Mumbai.
- Email/password sign-in and TOTP MFA enabled; local preview domains authorized.
- Owner account provisioned for the email above, with a private active owner record and admin claim.
- Shared published content and draft initialized.
- Dedicated server account has Firebase Auth admin and Datastore user roles.
- Its private key is only in ignored `.env.local`; no browser code or Git-tracked file contains it.
- No billing change or Vercel publication was made.

## Remaining limitations

Firebase Storage is not provisioned. The media page explains this and disables upload controls.
Existing `/images/...`, `/2d/...` asset paths and HTTPS image URLs work in editable image fields.
Enable uploads only after a bucket is configured, its direct-access rules deployed, runtime object permissions granted on that bucket, and `FIREBASE_MEDIA_ENABLED=true` set on the server.
The complete owner password/email/MFA login must be completed and checked by you; those secrets remain under your control.

## Security and recovery

Every private API request checks a revoked-session-aware Firebase cookie, verified email, TOTP factor, live admin claim and active owner/admin database role.
Mutation requests also require matching origin and CSRF token. Production cookies are Secure, HttpOnly and SameSite Strict.
Firestore direct browser access is denied; the server publishes only validated public content.
Route obscurity is not an authorization boundary: visiting `/admin/` alone does not grant access.
Sign out revokes your existing sessions. Password recovery does not remove MFA.
If you lose the authenticator, use a trusted Firebase project administrator to reset that factor and revoke sessions, then enroll again. Do not weaken the site's MFA check.

The rules and code have automated checks, but authenticated browser editing and publishing still need a first-login check before broad release.

## Verification recorded

Production build and static-output checks passed. Twelve CMS checks and 36 arcade checks passed.
Live checks verified Firestore-backed public pages, a single owner record, enabled TOTP, anonymous API rejection and direct dashboard protection. Direct unauthenticated Firestore reads were denied.
After patching gRPC, the production dependency audit reports no high or critical advisories; four moderate advisories remain in inherited dependencies. This is not a clean whole-project dependency audit.
Browser automation was unavailable, so visual review and the authenticated publish flow are not marked verified.
