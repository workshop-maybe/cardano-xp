---
name: auth
description: How authentication works — API keys for developers, JWTs for end users.
---

# Authentication

Two layers of auth in Andamio apps:

1. **Developer** — You have an API key that authenticates your app
2. **End User** — Your users get JWTs by signing with their wallet

## The Two Auth Flows

### Your App → Gateway (API Key)

Your API key goes in the `X-API-Key` header. The template handles this via a proxy:

```typescript
// All requests go through /api/gateway which adds your API key
const response = await fetch("/api/gateway/api/v2/course/list");
```

Set your API key in `.env.local`:

```bash
ANDAMIO_API_KEY="your-api-key"
```

### End User → Gateway (JWT)

Users authenticate by signing a nonce with their Cardano wallet:

```
1. POST /api/v2/auth/login/session → get nonce
2. User signs nonce with wallet (CIP-30)
3. POST /api/v2/auth/login/validate → get JWT
4. JWT used for authenticated requests
```

The `authenticateWithWallet()` function handles this:

```typescript
import { authenticateWithWallet } from "~/lib/andamio-auth";

const { jwt, user } = await authenticateWithWallet({
  signMessage: (nonce) => wallet.signData(address, nonce),
  address: bech32Address,
  walletName: "nami",
  getAssets: () => wallet.getAssets(), // Optional: detect access token
});
```

## Using the Auth Context

The app provides an auth context that handles everything:

```typescript
import { useAndamioAuth } from "~/contexts/andamio-auth-context";

function MyComponent() {
  const {
    isAuthenticated,  // Has valid JWT
    user,             // User info (id, alias, address)
    jwt,              // Current JWT for API calls
    login,            // Trigger auth flow
    logout,           // Clear session
  } = useAndamioAuth();

  if (!isAuthenticated) {
    return <button onClick={login}>Connect Wallet</button>;
  }

  return <div>Welcome, {user.accessTokenAlias}</div>;
}
```

## Making Authenticated API Calls

```typescript
import { gatewayAuth } from "~/lib/gateway";

// Public endpoint (no JWT needed)
const courses = await gateway<Course[]>("/api/v2/course/list");

// Authenticated endpoint (needs JWT)
const myCourses = await gatewayAuth<Course[]>(
  "/api/v2/course/owner/courses/list",
  jwt
);
```

## Access Tokens

Users with Andamio Access Tokens get additional features:

- **With token**: Simpler auth, alias-based identity
- **Without token**: Full wallet-signing flow still works

The auth system auto-detects access tokens in the wallet.

## Security Notes

### Wallet Switch Detection

The auth context monitors the connected wallet. If a user switches wallets while authenticated, they're automatically logged out. This prevents session hijacking.

### JWT Storage

JWTs are stored in localStorage:
- `andamio_jwt` — End user JWT (for app features)
- `andamio_dev_jwt` — Developer JWT (for API key management)

### JWT Expiration

```typescript
import { isJWTExpired } from "~/lib/andamio-auth";

if (isJWTExpired(jwt)) {
  // Re-authenticate
}
```

## Key Files

| File | Purpose |
|------|---------|
| `~/lib/andamio-auth.ts` | Auth functions |
| `~/contexts/andamio-auth-context.tsx` | React auth context |
| `~/lib/gateway.ts` | API client with auth |
| `~/app/api/gateway/[...path]/route.ts` | API proxy (adds X-API-Key) |
| `~/components/auth/connect-wallet-button.tsx` | Wallet connection UI |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/auth/login/session` | POST | Get nonce to sign |
| `/api/v2/auth/login/validate` | POST | Validate signature, get JWT |
| `/api/v2/auth/developer/account/login` | POST | Developer login (with alias) |

---

## Compound Engineering

Auth issues can be tricky — wallet signatures, hex-to-bech32 conversion, JWT expiration, session hijacking edge cases. When you solve an auth problem, document it:

```bash
/workflows:compound
```

This captures the problem in `docs/solutions/` so the next person (or future you) finds the fix in minutes. Check `docs/solutions/` before debugging — someone may have already solved it.

---

**Last Updated**: March 2026
