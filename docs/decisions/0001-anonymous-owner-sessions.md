# ADR 0001: Anonymous Owner Sessions

## Status

Accepted — 15 July 2026

## Context

SplitJe is designed for immediate use at a restaurant table or after a mill. Requiring account registration before creating a bill would add friction to the primary workflow and may lead to user drop rates.

Bill ownership still requires a secure, server-verifiable identity. A plain browser cookie or owner token would require custom authentication and authorization logic.

## Decision

SplitJe will create a Supabase anonymous user session when someone creates their first bill without an existing session.

The anonymous user ID will be stored as `bills.owner_user_id`. Existing Row Level Security policies based on `auth.uid()` will protect the bill and its related data.

Creating an account will not be required. Anonymous owners may later link an email or supported identity to preserve the same user ID and access their bills across devices.

## Consequences

### Benefits

- No registration barrier before creating a bill.
- Existing Supabase Auth and RLS protections remain applicable.
- Anonymous and permanent owners use the same ownership model.
- Identity linking can preserve existing bill ownership.
- The initial restaurant-table workflow remains fast.

### Limitations

- Anonymous ownership is initially tied to the current browser session.
- Clearing cookies, signing out, or changing devices can make bills unrecoverable.
- The application must clearly communicate the recovery limitation.
- Anonymous sign-up requires rate limiting and abuse controls.
- Abandoned anonymous users and draft bills require eventual cleanup.

## Security Rules

- Never treat an unsigned bill ID cookie as proof of ownership.
- Verify the Supabase session before owner operations.
- Continue enforcing ownership through RLS.
- Never expose service-role credentials to browser code.
- Warn anonymous owners before signing out.
- Do not broaden participant links into owner access.

## Follow-Up Work

- Enable Supabase Anonymous Sign-Ins.
- Add an anonymous-session creation service.
- Update protected-route behavior.
- Add “Saved on this browser” messaging.
- Add optional identity linking.
- Add rate limiting and abandoned-data retention.