import { useAuth } from './useAuth'

/**
 * Estado de la sesión técnica OIDC. Facade sobre {@link useAuth} que mantiene la
 * convención de naming usada por las apps Maya (`isOidcLoading`, `isOidcSignedIn`,
 * `beginSignIn`). No sustituye al perfil de negocio (`useUserProfile`).
 */
export function useOidcSession() {
  const { isLoading, isAuthenticated, login, user, logout } = useAuth()

  return {
    isOidcLoading: isLoading,
    isOidcSignedIn: isAuthenticated,
    beginSignIn: login,
    user,
    logout,
  }
}
