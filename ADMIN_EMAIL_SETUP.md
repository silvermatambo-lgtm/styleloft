# StyleLoft owner login — verification email checklist

**Site:** https://www.styleloft.co.za  
**Admin login:** https://www.styleloft.co.za/admin.html  
**Supabase project:** `styleloft-store` (`eojkepvidtzougqlqslj`)

## Current status (23 November 2026)

- Supabase database is ACTIVE_HEALTHY.
- Public and admin frontend files are deployed and loading on production.
- Owner email sign-up, password login, verification and password recovery are coded in `admin.js`.
- A **Resend verification email** button is included.
- There are no registered users yet, so no real owner email has been successfully delivered and verified.
- **Do not promise email delivery is working until custom SMTP and Auth redirects are configured and a real inbox test is completed.**
- Supabase's default email sender only emails authorised project team members. The shop owner is not necessarily a team member.

## First-owner automatic admin assignment

The first signup that submits the **private one-time StyleLoft owner code** is granted administrator permissions by a protected Postgres trigger at registration. No separate claim screen is needed. Subsequent registration attempts without a valid, unclaimed code are rejected; never open unrestricted public admin signups.

## Configure in Supabase Dashboard

1. Open https://supabase.com/dashboard/project/eojkepvidtzougqlqslj/auth/providers and find the **Email** provider.
2. Leave **Email signups** enabled.
3. **Recommended secure mode:** Keep **Confirm Email ON**, configure working SMTP, and have the owner verify the first email before using the dashboard.
4. **Owner-requested no-confirmation option:** The project administrator can switch **Confirm Email OFF** in the dashboard. This is not currently exposed by the connected Supabase tools, so it cannot be changed automatically from GitHub or Vercel. With the private one-time code and confirmation turned off, the first owner should be able to sign in immediately after registering. This lowers protection against typos and accounts created using an email the registrant does not control. Password recovery by email still needs functional SMTP.
5. Set the **Authentication > URL Configuration** Site URL to `https://www.styleloft.co.za`, and allow `https://www.styleloft.co.za/admin.html` as an additional redirect URL. Remove `localhost` as the production Site URL.
6. For sign-up confirmation and password reset emails, configure **Authentication > SMTP Settings / Custom SMTP** with a verified transactional sender or existing supported mailbox. Store SMTP passwords only in Supabase's secure dashboard.
7. If using a custom sender domain, configure SPF, DKIM and DMARC according to the email provider.

## Required real-world test

1. From a phone or computer open https://www.styleloft.co.za/admin.html.
2. Enter the **real owner's email address**, a strong password and the **private one-time owner setup code** before selecting **Create owner account**.
3. If Confirm Email is enabled, receive and open the confirmation email; the link should return to the StyleLoft admin page. If confirmation is off, the account should sign in immediately without a mail step.
4. Sign in with email and password; check that the dashboard loads **without a second administrator activation code**.
5. Sign out and sign in again. Test password recovery if SMTP is configured.
6. Create one hidden test product, upload a photo, update its price and delete it.

**Do not consume the one-time code with an invented test email**: the code can be used only once and must be claimed by the real owner.

## Verify security

- Only the **first valid private-code registration** becomes an administrator; the role is not granted to every account.
- Do not publish or embed the private owner code in GitHub or website JavaScript.
- If skipping verification, ensure the owner has access to the chosen mailbox for future password recovery.
- Never share SMTP credentials, Supabase service-role keys or Paystack secret keys in public files.
- Paystack and Courier Guy activation are separate and remain pending.

Official Supabase docs:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/general-configuration
