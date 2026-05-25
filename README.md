# @ceedcv-maya/shared-auth-react

Keycloak OIDC authentication for React: hooks (useAuth, useOidcSession), AuthContext, configured Axios apiClient with auto-refresh, return-to flow.

Part of the [ceedcv-maya/maya_platform](https://github.com/Maya-AQSS/maya_platform) mono-repo. Distributed independently for reuse outside the Maya ecosystem.

## Installation

```bash
npm install @ceedcv-maya/shared-auth-react keycloak-js axios @tanstack/react-query
```

```tsx
import { AuthProvider, useAuth, createApiClient } from '@ceedcv-maya/shared-auth-react'

const api = createApiClient({ baseURL: import.meta.env.VITE_API_URL })

export function App() {
  return (
    <AuthProvider config={{ url: 'https://keycloak.example.org', realm: 'my-realm', clientId: 'my-app' }}>
      <Dashboard />
    </AuthProvider>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  return <div>Hi {user?.name}</div>
}
```


## TypeScript / build notes
This package ships TypeScript source (`src/index.ts` as entry). Consumers using Vite or Webpack with `ts-loader` work out of the box. Next.js consumers must add this package to `transpilePackages` in `next.config.js`.

## License

MIT — see [LICENSE](LICENSE).

## Reporting issues

The canonical source lives in [Maya-AQSS/maya_platform](https://github.com/Maya-AQSS/maya_platform). File issues there; this read-only split repo is only the published artifact.
