---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Initial emergency procedures documentation"
---

# Emergency Procedures

When things go wrong in production. Stay calm, follow the steps.

## First Response

Before doing anything:

1. **Don't panic** - Rushed fixes often make things worse
2. **Assess the scope** - Is it affecting all users or just some?
3. **Check if it's actually your fault** - Third-party outages happen (Convex, Vercel, Stripe, Google)
4. **Document what you see** - Screenshots, error messages, timestamps

## Quick Health Checks

| Service | Status Page |
|---------|-------------|
| Convex | https://status.convex.dev |
| Vercel | https://www.vercel-status.com |
| Stripe | https://status.stripe.com |
| Resend | https://resend-status.com |
| Google Cloud | https://status.cloud.google.com |

Check these first. If a service is down, you wait - there's nothing to fix on your end.

---

## Scenario: Bad Code Deploy

**Symptoms:** App is broken, errors everywhere, happened right after a deploy.

**Fix:**

1. Go to GitHub
2. Find the bad commit
3. Click "Revert" to create a revert commit
4. Push the revert
5. Vercel auto-deploys the fix
6. Verify the app works again
7. Figure out what went wrong before re-attempting

**Time to fix:** ~5 minutes if you act quickly.

---

## Scenario: Bad Schema Migration

**Symptoms:** Convex deploy failed, or deployed but data is wrong/missing.

**If deploy failed:** Good news - production wasn't touched. Fix your migration in dev and try again.

**If deploy succeeded but data is wrong:**

1. Don't deploy more changes - you might make it worse
2. Assess what data was affected
3. Write a "fix-it" mutation that corrects the data
4. Test it in dev with similar data
5. Run it in production via Convex dashboard (Functions → Run)
6. Verify the fix

**Prevention:** Always test migrations on realistic dev data first.

---

## Scenario: Auth is Broken

**Symptoms:** Users can't sign in, getting auth errors.

**Check in order:**

1. **Convex status** - Is the backend up?
2. **Environment variables** - Did they get deleted? Check production deployment in Convex dashboard.
3. **Google OAuth** - Check Google Cloud Console for errors. Did credentials expire?
4. **Better Auth session** - Is `BETTER_AUTH_SECRET` set correctly in prod?
5. **CORS** - Did your domain change? Check `SITE_URL` env var.

**Quick test:** Try Google OAuth vs email/password separately to isolate the issue.

---

## Scenario: Stripe Payments Broken

**Symptoms:** Payments failing, webhooks not arriving.

**Check in order:**

1. **Stripe status page** - Is Stripe having issues?
2. **Stripe dashboard → Webhooks** - Are webhooks failing? Check the logs.
3. **Webhook secret** - Does `STRIPE_WEBHOOK_SECRET` in Convex match Stripe dashboard?
4. **Endpoint URL** - Is the webhook pointing to correct Convex URL?
5. **Test mode vs Live mode** - Are you using live keys in production?

**Webhook debugging:**
- Stripe dashboard shows every webhook attempt
- You can see the payload and response
- You can manually resend failed webhooks

---

## Scenario: Data Corruption

**Symptoms:** Users seeing wrong data, data missing, inconsistent state.

**Immediate steps:**

1. **Identify the scope** - How many users? What data?
2. **Stop the bleeding** - If a function is causing it, deploy a fix or disable the feature
3. **Don't bulk-delete anything** - You might make it worse

**Recovery:**

1. Query the affected data in Convex dashboard
2. Understand the pattern - what's wrong and why
3. Write a targeted fix mutation
4. Test on a small subset first
5. Run on all affected data
6. Verify

**Convex backups:** Convex automatically backs up data. Contact Convex support for point-in-time recovery if needed.

---

## Scenario: Site is Down

**Symptoms:** Users see errors, blank pages, or can't reach the site.

**Check in order:**

1. **Vercel status** - Is Vercel having issues?
2. **Your domain** - DNS issues? Check with your registrar.
3. **Convex status** - Is the backend up?
4. **Recent deploys** - Did something just deploy? Check Vercel deployment logs.
5. **Browser console** - What errors are showing?

**If Vercel is fine but site is broken:**
- Check Vercel deployment logs for build errors
- Roll back to previous deployment in Vercel dashboard (Deployments → ... → Redeploy)

---

## Scenario: Email Not Sending

**Symptoms:** Verification emails, password reset emails not arriving.

**Check in order:**

1. **Resend status** - Is Resend having issues?
2. **Resend dashboard** - Check Logs. Are emails being sent? Bouncing?
3. **API key** - Is `RESEND_API_KEY` set in production?
4. **Domain verification** - Is your sending domain still verified?
5. **Spam folders** - Are emails being marked as spam?

**Quick test:** Send a test email from Resend dashboard to verify the service works.

---

## Scenario: Rate Limited / Quota Exceeded

**Symptoms:** Functions failing, "quota exceeded" errors.

**Convex free tier limits:**
- Function calls
- Database bandwidth
- Storage

**Immediate fix:**
- Upgrade your Convex plan if needed
- Or wait for the quota to reset (usually daily)

**Long-term fix:**
- Optimize inefficient queries
- Add caching where appropriate
- Reduce unnecessary function calls

---

## Scenario: Security Incident

**Symptoms:** Suspicious activity, unauthorized access, leaked credentials.

**Immediate steps:**

1. **Rotate all secrets** - Generate new keys for everything:
   - `BETTER_AUTH_SECRET`
   - `STRIPE_SECRET_KEY` (revoke old one in Stripe dashboard)
   - `RESEND_API_KEY` (revoke old one in Resend dashboard)
   - Google OAuth credentials (create new ones in Google Cloud Console)

2. **Check access logs** - Convex dashboard shows function calls, Stripe shows API calls

3. **Invalidate sessions** - If auth was compromised, you may need to force all users to re-login

4. **Assess damage** - What data might have been accessed?

5. **Notify affected users** - If user data was compromised, you have legal obligations

---

## Communication Template

If users are affected, communicate:

```
We're aware of [brief issue description] and are working on a fix.

What's happening: [simple explanation]
What we're doing: [your action]
ETA: [if known, otherwise "we'll update shortly"]

We apologize for the inconvenience.
```

Update when fixed:

```
The issue with [brief description] has been resolved.

What happened: [simple root cause]
What we did: [how you fixed it]
Prevention: [what you're doing to prevent recurrence]

Thank you for your patience.
```

---

## Prevention Checklist

Before deploying risky changes:

- [ ] Tested thoroughly in dev with realistic data
- [ ] Schema changes are additive (not removing/renaming with data)
- [ ] Have a rollback plan ready
- [ ] Know how to access Convex dashboard quickly
- [ ] Recent backup exists (Convex auto-backs up, but know how to request restore)

---

## Contacts & Resources

| Service | Support |
|---------|--------|
| Convex | Discord community, support@convex.dev |
| Vercel | support.vercel.com |
| Stripe | dashboard → Help |
| Resend | resend.com/contact |

## Related

- [Dev vs Production](../03-convex/dev-v-prod.md) - Normal deployment workflow
- [Critical Notes](critical-notes.md) - Pre-production checklist