# Auth0 Dashboard Configuration Guide

> **Required** before Auth0 Universal Login will work in production.

## Auth0 Tenant

- **Domain**: `dev-tu36ndmyt7pr2coi.us.auth0.com`
- **Client ID**: `1sYhiLWVUjrqwAgqT9SRwfGmz4Jjyd9X`

---

## Step 1: Application Settings

Navigate to: **Applications → Applications → Select your app → Settings**

| Setting | Value |
|---------|-------|
| Application Type | **Single Page Application** |
| Allowed Callback URLs | `https://peacefullai.netlify.app/callback, http://localhost:5173/callback` |
| Allowed Logout URLs | `https://peacefullai.netlify.app, http://localhost:5173` |
| Allowed Web Origins | `https://peacefullai.netlify.app, http://localhost:5173` |
| Token Endpoint Auth Method | **None** (SPA apps don't use client secrets) |

Scroll down and click **Save Changes**.

---

## Step 2: Create API (if not already created)

Navigate to: **Applications → APIs → Create API**

| Setting | Value |
|---------|-------|
| Name | `Peacefull API` |
| Identifier (Audience) | `https://api.peacefull.ai` |
| Signing Algorithm | **RS256** |

This is already referenced in the backend as `AUTH0_AUDIENCE`.

---

## Step 3: Enable Social Connections (Google + Microsoft)

### Google Login
1. **Authentication → Social → Google**
2. Enable the connection
3. Enter Google OAuth Client ID and Client Secret
   - Create at: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Authorized redirect URI: `https://dev-tu36ndmyt7pr2coi.us.auth0.com/login/callback`
4. Enable for your Application

### Microsoft Login
1. **Authentication → Social → Microsoft Account** (or Windows Live)
2. Enable the connection
3. Enter Azure AD App Registration Client ID and Secret
   - Create at: [Azure Portal → App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
   - Redirect URI: `https://dev-tu36ndmyt7pr2coi.us.auth0.com/login/callback`
4. Enable for your Application

---

## Step 4: Database Connection

Navigate to: **Authentication → Database → Username-Password-Authentication**

Ensure:
- Connection is **enabled** for your Application
- Password policy: at least 12 characters, uppercase, lowercase, digit, special char

---

## Step 5: Universal Login Branding (Optional)

Navigate to: **Branding → Universal Login**

1. Select **New Universal Login Experience**
2. Customize:
   - Logo URL: Upload Peacefull logo
   - Primary Color: `#6366F1` (brand color)
   - Page Background Color: `#F8FAFC`

---

## Step 6 (Optional): Add Email to Access Token

To allow the backend to verify the user's email directly from the access token
(instead of relying on the request body), create a Post-Login Action:

1. **Actions → Flows → Login**
2. Create a new Action:
   ```javascript
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = 'https://peacefull.ai/';
     api.accessToken.setCustomClaim(`${namespace}email`, event.user.email);
     api.accessToken.setCustomClaim(`${namespace}role`, event.user.app_metadata?.role || 'PATIENT');
     api.accessToken.setCustomClaim(`${namespace}tid`, event.user.app_metadata?.tenantId || 'default');
   };
   ```
3. Deploy and drag into the Login Flow

---

## Verification Checklist

After completing the Auth0 Dashboard configuration:

1. [ ] Visit `https://peacefullai.netlify.app/login`
2. [ ] Click **"Sign in with Auth0"** button
3. [ ] Auth0 Universal Login page should appear
4. [ ] Sign up with a new email or sign in with Google/Microsoft
5. [ ] After auth, redirected to `/callback` → JIT user provisioned → redirected to dashboard
6. [ ] Check backend logs for `Auth0 sync: JIT user provisioned` or `Auth0 sync: existing user logged in`

---

## Architecture Summary

```
User → Netlify (Login Page) → "Sign in with Auth0" button
     → Auth0 Universal Login (hosted by Auth0)
     → Auth0 authenticates (DB / Google / Microsoft)
     → Redirect back to /callback with authorization code
     → Auth0 React SDK exchanges code for tokens
     → Frontend calls POST /api/v1/auth/auth0-sync with Auth0 access token
     → Backend verifies Auth0 token via JWKS (RS256)
     → Backend finds or creates local user (JIT provisioning)
     → Returns local JWT tokens
     → Frontend stores tokens, redirects to dashboard
```

## Environment Variables

### Frontend (Netlify - already configured in `netlify.toml`)
- `VITE_AUTH0_DOMAIN` = `dev-tu36ndmyt7pr2coi.us.auth0.com`
- `VITE_AUTH0_CLIENT_ID` = `1sYhiLWVUjrqwAgqT9SRwfGmz4Jjyd9X`
- `VITE_AUTH0_AUDIENCE` = `https://api.peacefull.ai`

### Backend (ECS - already configured via Secrets Manager)
- `AUTH0_DOMAIN` = from `peacefull/prod/auth0-domain`
- `AUTH0_CLIENT_ID` = from `peacefull/prod/auth0-client-id`
- `AUTH0_CLIENT_SECRET` = from `peacefull/prod/auth0-client-secret`
- `AUTH0_AUDIENCE` = `https://api.peacefull.ai`
