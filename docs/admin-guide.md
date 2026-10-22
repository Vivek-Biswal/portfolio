# Private portfolio workspace

Open `/admin/login/` directly. There is no login link on public pages.
Local URL: http://127.0.0.1:5173/admin/login/
Existing production login: https://vivekbiswal.vercel.app/admin/login/

## Your first login

Use your existing password and current six-digit authenticator code if you have already enrolled. The following steps are for initial setup or password recovery; the authenticator setup key is not entered again on every login.

1. Enter `vivekbiswal.dev@gmail.com` and click **Forgot your password?** if you have not chosen a password or need to reset it.
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
Vercel builds package public page templates inside the server function and remove matching static HTML and contact downloads from the hosted output. This lets the CMS routes serve current content instead of an older static copy. Ordinary local builds retain static pages for offline preview; use `--server-only` with the packaging and verification scripts to check hosted output locally.
History can restore a previous publication. Concurrent draft changes are rejected rather than overwritten.
The downloadable text profile and contact card also use published content.

## GitHub inbox: discover, review, then publish

Open **GitHub inbox** after signing in. It scans only public repositories owned by `Vivek-Biswal` (or the optional server setting `GITHUB_OWNER`). It does not read private repositories, repository files or README contents, and does not change anything on GitHub. No GitHub token or OAuth application is needed.

1. Click **Check GitHub now** or wait for the daily production scan. Discovery adds private inbox suggestions, never public projects.
2. Open a repository to compare its detected GitHub details with the portfolio preview. Edit the title, description, additional details, image, category, year, links and technologies. **Use GitHub details** refreshes the editable preview from the detected source; review it before approving.
3. **Approve and publish project/update** publishes only that project across all three worlds and updates its entry in the shared draft. It does not publish unrelated unfinished draft changes. Save unsaved editor changes first.
4. **Reject** hides that source version from the pending queue. **Keep pending** leaves it for later review. Neither changes the public portfolio. An unchanged rejected source stays rejected; a later GitHub change can return it to pending.
5. **Unpublish project** removes the linked project from the portfolio's draft and public content. It does not delete the GitHub repository. The inbox retains an **Unpublished** record, and an unchanged scan does not republish it.

New repositories and changed repository metadata always require approval. An approved public snapshot stays as it is while an update waits for review. Later refinements made in **Projects** are retained in the next preview. Stable numeric repository IDs prevent duplicate imports when a repository is renamed. If a repository becomes private, missing or unavailable, approval is blocked; an existing public entry remains until you choose to unpublish it.

Review requests check the inbox fingerprint/version and both shared-content versions. If another edit changes the draft or published content, reload the preview before approving or unpublishing. A stale review cannot overwrite the newer edit. Publications create revision and audit records.

### Free discovery schedule and limits

The daily cron is configured in `vercel.json` for `03:00 UTC` (`08:30 IST`) at `/api/github-sync/`. The trailing slash avoids a redirect, which Vercel cron does not follow. It runs on the production deployment after that configuration is deployed. Vercel Hobby permits daily cron jobs and may invoke them later within the scheduled hour; this is not a precise-time service. Cron executions also count toward the plan's function allowance. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Manual checks have a five-minute cooldown, and a scan lock prevents overlapping requests. Each scan checks at most 500 repositories using up to five public API requests. Incomplete scans never mark unchecked repositories as missing. Provider failures or rate limits preserve existing suggestions and public content. GitHub's unauthenticated allowance is 60 requests per hour per originating IP, so a cooldown expiring does not guarantee the provider allowance has reset. [GitHub rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Set a strong, private `CRON_SECRET` in the production server environment before enabling scheduled scans. Vercel sends it as a bearer credential; the endpoint rejects missing or incorrect credentials. Keep it out of Git, public content and `VITE_*` variables. `.env.example` contains only an empty placeholder. Manual refresh remains available to authenticated administrators without this scheduling secret. [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

This setup adds no paid API, payment processing or paid scheduling service. Existing Firebase and hosting free-tier quotas still apply; free does not mean unlimited usage.

## Contact channels and meeting booking

In **Contact**, manage the email address, optional phone/location, heading, message, resume/contact-card URLs and social links. LinkedIn, X/Twitter and GitHub links appear as named channels when configured. All worlds use the same published values while keeping their individual layouts. The pixel Contact window also offers **Copy email**, **Save contact** and **Download profile** when the relevant links are present.

Under **Meeting scheduling**, enter the public booking-page URL, button label, meeting length and timezone. Supported booking links are a Google Calendar appointment schedule, its `calendar.app.google` short link, or a public Cal.com event. A `meet.google.com` room URL is not a booking page and is rejected.

For this portfolio, the requested booking setup is **Saturday, 2:00–5:00 PM IST (`Asia/Kolkata`), 30-minute meetings**, with Google Meet and a required meeting-purpose field. Manage the real availability and booking form in Google Calendar's appointment schedule. The duration/timezone fields in the CMS describe the link; editing them does not change the provider's actual schedule.

To create or replace the booking page, open Google Calendar on desktop → **Create** → **Appointment schedule**. Set availability, duration, Google Meet and the required purpose question, save, then copy the public booking link into Contact. A personal Google account can use one booking page without purchasing premium scheduling features. No Calendar API key, OAuth client or email-sending API is required by the portfolio. [Google appointment features](https://support.google.com/calendar/answer/16287038).

Save the draft and publish to display the booking channel in every world. Visitors choose a time on the provider's page; the provider manages availability, Meet links, booking confirmations, cancellation and rescheduling. Merely opening the portfolio's link does not confirm a meeting. An empty booking URL keeps email/social contact available and shows the fallback **Meetings by email for now**.

## Setup completed

- Firebase project: `vivek-biswal`; Standard Firestore in Mumbai.
- Email/password sign-in and TOTP MFA enabled; local preview domains authorized.
- Owner account provisioned for the email above, with a private active owner record and admin claim.
- Shared published content and draft initialized.
- Dedicated server account has Firebase Auth admin and Datastore user roles.
- Firebase server credentials were configured in private local and Vercel environments during the earlier production deployment. No browser code or Git-tracked file should contain them.
- The portfolio and protected admin backend were already deployed to `vivekbiswal.vercel.app` in earlier work. This guide describes the new integration workflow; it is not confirmation that the current GitHub/Contact integration release has been deployed or verified live.

## Remaining limitations

Firebase Storage is not provisioned. The media page explains this and disables upload controls.
Existing `/images/...`, `/2d/...` asset paths and HTTPS image URLs work in editable image fields.
Enable uploads only after a bucket is configured, its direct-access rules deployed, runtime object permissions granted on that bucket, and `FIREBASE_MEDIA_ENABLED=true` set on the server.
Your password and authenticator remain under your control. Complete any account recovery or interactive authenticator prompt yourself.

## Security and recovery

Every private API request checks a revoked-session-aware Firebase cookie, verified email, TOTP factor, live admin claim and active owner/admin database role.
Mutation requests also require matching origin and CSRF token. Production cookies are Secure, HttpOnly and SameSite Strict.
Firestore direct browser access is denied; the server publishes only validated public content.
Route obscurity is not an authorization boundary: visiting `/admin/` alone does not grant access.
Sign out revokes your existing sessions. Password recovery does not remove MFA.
If you lose the authenticator, use a trusted Firebase project administrator to reset that factor and revoke sessions, then enroll again. Do not weaken the site's MFA check.

Authenticated browser editing, repository review and real booking should be checked against the deployed release with an authorized account. Do not infer live verification from local tests alone.

## Verification recorded

Earlier deployment checks verified Firestore-backed public pages, owner/MFA configuration, anonymous API rejection and direct dashboard protection. Those results describe the prior backend deployment, not the current integration release.

Run these checks for the current source before deployment:

```sh
npm run test:runtime
npm run test:cms
npm run test:integrations
npm run test:arcade
npm run build
npm run verify:dist
```

`test:integrations` covers the GitHub inbox/approval workflow and shared Contact/booking rendering. It uses fake GitHub responses and an in-memory transactional database; it does not publish real projects or book a real meeting. After deployment, verify private-route protection, a manual scan, review/version-conflict handling, Contact links in all worlds and the provider's booking page separately. Do not claim the current dependency audit or authenticated end-to-end flow has passed unless a fresh run verifies it.
