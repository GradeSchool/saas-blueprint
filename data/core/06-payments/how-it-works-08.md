---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 8: User Returns to Your App

This is the most important chapter for understanding the checkout flow.

---

## What Happens

1. After payment, Stripe redirects user to your success URL
2. User lands on your app with `?session_id=cs_xxx` in the URL
3. Two things are now racing:
   - The webhook being processed by your server
   - The user's browser loading your success page

---

## The Race Condition

**The situation:** User might return before the webhook has been processed.

**Timeline example:**
```
t=0ms     Payment succeeds on Stripe
t=50ms    Stripe sends webhook to your server
t=60ms    User redirected to your success page
t=70ms    User's browser loads your app
t=100ms   Webhook finishes processing, subscription saved
```

In this case, the user sees your app for 30ms before the subscription data exists.

---

## Two Approaches

### Current Approach: Convex Component (Webhook-Based)

**How it works:**
1. User returns to app
2. Reactive query checks subscription status
3. If webhook arrived first → user sees "active" instantly
4. If user arrived first → user sees "Processing..." briefly
5. Webhook arrives, Convex updates, reactive query pushes new data
6. UI updates automatically (no refresh needed)

**Pros:**
- Simple, already built into the component
- Convex reactivity makes the wait feel short
- No extra code needed

**Cons:**
- User might see "Processing..." for 1-5 seconds (usually less)
- If webhook is delayed (rare), user waits longer
- If webhook fails (very rare), user is stuck

**Is this risky?** No breaking bugs. Data is always correct. Worst case is slightly slower UX.

---

### Future-Proof Approach: Theo's Pattern (Eager Sync)

From [Theo's Stripe Recommendations](https://github.com/t3dotgg/stripe-recommendations):

**How it works:**
1. User returns to success page
2. Success page immediately calls Stripe API: "What's this customer's subscription?"
3. Stripe returns fresh data
4. Your app writes it to database
5. User sees "active" instantly
6. Webhook also arrives (does the same thing, no conflict)

**Pros:**
- User always sees success instantly
- Two paths to success (eager sync + webhook backup)
- More resilient

**Cons:**
- Extra code to write
- Extra Stripe API call

**Key insight from Theo:** Use a single sync function for both the success page AND webhooks. Both paths call the same function, so there's no race condition between two different writers.

---

## Our Decision: Start Simple, Future-Proof Later

**Phase 1 (Now):** Use the Convex Stripe component as-is.
- Webhooks handle everything
- Convex reactivity updates the UI
- Ship it, see if users complain

**Phase 2 (If Needed):** Add Theo's eager sync pattern.
- The Convex Stripe component is compatible with this
- We can add a success page sync action without replacing the component
- The component's `getOrCreateCustomer` already supports idempotency keys

**The component is NOT a blocker.** We can layer Theo's pattern on top if we see UX issues.

---

## What the Success Page Should Show

**Current (Phase 1):**
```typescript
function SuccessPage() {
  const subscription = useQuery(api.billing.getSubscriptionStatus);
  
  if (subscription === undefined) {
    return <div>Loading...</div>;
  }
  
  if (subscription === null) {
    // Webhook hasn't arrived yet
    return <div>Processing your subscription...</div>;
  }
  
  if (subscription.status === 'active') {
    return <div>Welcome! Your subscription is active.</div>;
  }
}
```

**Future (Phase 2 - if needed):**
```typescript
function SuccessPage() {
  const syncMutation = useMutation(api.billing.syncFromStripe);
  
  useEffect(() => {
    // Eagerly sync on mount
    syncMutation({ userId });
  }, []);
  
  // Rest is the same - reactive query will update
}
```

---

## What Can Go Wrong

**Webhook wins (common, happy path):**
- User sees "active" instantly
- Nothing to worry about

**User wins (occasional):**
- User sees "Processing..." for 1-5 seconds
- Webhook arrives, UI updates automatically
- User sees "active"

**Webhook significantly delayed (rare):**
- User sees "Processing..." for 10+ seconds
- Might get confused, refresh, or close browser
- Consider adding: "Taking longer than expected. Check back in a moment."

**Webhook fails entirely (very rare):**
- User stuck on "Processing..."
- Check Stripe dashboard for failed webhooks
- This indicates a configuration problem, not a code bug

---

[← Chapter 7: Stripe Tells You](how-it-works-07.md) | [Chapter 9: Life is Good →](how-it-works-09.md)
