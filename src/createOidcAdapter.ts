/**
 * createOidcAdapter — factory para inicializar el cliente OIDC (Keycloak).
 *
 * Extrae el patrón boilerplate de `src/auth/oidcAdapter.ts` que existe en cada
 * uno de los cinco microservicios Maya. Devuelve los tres primitivos que el resto
 * de la app necesita.
 *
 * @example
 * // src/auth/oidcAdapter.ts  (en cualquier app Maya)
 * import { createOidcAdapter } from '@ceedcv-maya/shared-auth-react';
 *
 * export const { oidcAuthService, appendBearerAuthorization, triggerSignIn } =
 *   createOidcAdapter({
 *     url: import.meta.env.VITE_KEYCLOAK_URL,
 *     realm: import.meta.env.VITE_KEYCLOAK_REALM,
 *     clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
 *   });
 */
import { AuthService } from './authService';
import type { KeycloakConfig } from './types';

export interface OidcAdapter {
  /** Configured AuthService instance. Use `.keycloak` to pass to `createApiClient`. */
  oidcAuthService: AuthService;
  /**
   * Attaches `Authorization: Bearer <token>` to a headers object.
   * Renews the token if expiring within 30 s.
   */
  appendBearerAuthorization: (headers: Record<string, string>) => Promise<void>;
  /** Triggers the Keycloak login redirect flow. */
  triggerSignIn: () => void;
}

export function createOidcAdapter(config: KeycloakConfig): OidcAdapter {
  const oidcAuthService = new AuthService(config);

  const appendBearerAuthorization = (headers: Record<string, string>): Promise<void> =>
    oidcAuthService.appendBearerAuthorization(headers);

  const triggerSignIn = (): void => oidcAuthService.triggerSignIn();

  return { oidcAuthService, appendBearerAuthorization, triggerSignIn };
}
