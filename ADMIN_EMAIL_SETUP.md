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

## Configure in Supabase Dashboard

1. Open https://supabase.com/dashboard and select project **styleloft-store**.
2. Under **Authentication > Providers > Email**, ensure Email sign-in / sign-up is enabled and **Confirm Email** is **ON**.
3. Under **Authentication > URL Configuration**, set:
   - Site URL: `https://www.styleloft.co.za`
   - Additional Redirect URL: `https://www.styleloft.co.za/admin.html`
   - If desired, also allow `https://www.styleloft.co.za/`.
   Remove `localhost` as the production Site URL.
4. Under **Authentication > SMTP Settings / Custom SMTP**, turn on a verified, production SMTP service (e.g., an authenticated StyleLoft mailbox or a dedicated transactional email service). Enter from email, from name, SMTP host, SMTP port, username and SMTP password/API SMTP credential. Keep this password in the provider's secure settings, never in GitHub or WhatsApp. For an existing DirectAdmin mailbox, use its exact server settings, not assumptions.
5. For custom sending domains, set the provider-specified SPF, DKIM and DMARC records correctly.
6. Check the built-in signup confirmation email template uses the confirmation link `{{ .ConfirmationURL }}`, or a correctly configured `{{ .RedirectTo }}` flow.
7. Review Authentication > Rate Limits if emails are throttled.

## Required real-world test

1. From a phone or computer open https://www.styleloft.co.za/admin.html.
2. Enter an **actual owner-controlled inbox** and strong password; select **Create owner account**.
3. Receive a confirmation message. If missing, check Spam/Junk, use **Resend verification email**, and inspect **Authentication > Logs**. Check SMTP error codes.
4. Open the link. It should return to the owner admin page, not localhost or a blank page.
5. Sign in using email/password, then enter the private one-time owner setup code to claim authorised admin access.
6. Sign out/in again, use the correct password recovery link and ensure it works.
7. Create and edit one **hidden test product**, upload a photo, confirm it saves, and delete it.

## Verify security

- Never disable confirmation just to avoid SMTP setup; no manual email verification bypass.
- Admin role is separately protected by the one-time owner setup claim and database row-level security.
- Never share the Supabase service-role key, SMTP password or Paystack secret in GitHub/source code.
- **The owner's dashboard is separate from the Paystack and Courier Guy checkout.** Those integrations remain gated pending courier configuration and testing.

Official Supabase docs:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/general-configuration
