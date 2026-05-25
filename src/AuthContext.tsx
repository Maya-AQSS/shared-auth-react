import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type Keycloak from 'keycloak-js'
import type { AuthUser } from './types'
import { clearCachedUserProfile } from './userProfileCache'
import {
  applyOverridesFromCookie,
  clearSessionScopedOverrides,
  readLogoutSignal,
  signalLogoutAcrossApps,
} from './sessionOverrides'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  keycloak: Keycloak
  /**
   * Persist a user preference attribute on Keycloak (via the Account REST API)
   * and refresh the token so that downstream apps see the new claim without
   * requiring a re-login.
   *
   * Returns the updated token (or null if it could not be refreshed).
   */
  updateUserAttribute: (name: string, value: string) => Promise<string | null>
  /** Convenience wrapper around updateUserAttribute for the `locale` attribute. */
  updateLocale: (locale: string) => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function parseUserFromToken(tokenParsed: Record<string, unknown>): AuthUser {
  return {
    sub: String(tokenParsed['sub'] ?? ''),
    email: String(tokenParsed['email'] ?? ''),
    name: String(tokenParsed['name'] ?? ''),
    preferred_username: String(tokenParsed['preferred_username'] ?? ''),
    locale: typeof tokenParsed['locale'] === 'string' ? (tokenParsed['locale'] as string) : undefined,
  }
}

export interface AuthProviderProps {
  children: ReactNode
  keycloak: Keycloak
  onLoad?: 'login-required' | 'check-sso'
  enableLogging?: boolean
}

export function AuthProvider({ children, keycloak, onLoad = 'login-required', enableLogging = false }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) {
      if (enableLogging) console.log('⏭️ Keycloak ya inicializado, saltando...')
      return
    }

    if (enableLogging) console.log('🔐 Iniciando autenticación con Keycloak...')
    initializedRef.current = true

    let intervalId: ReturnType<typeof setInterval> | undefined

    // Safety net: if init() redirects via window.location.replace before settling,
    // the .finally() never runs. Unblock isLoading after 15s so App.tsx can render
    // the "Redirigiendo..." branch and trigger beginSignIn().
    const loadingTimeoutId = setTimeout(() => {
      if (enableLogging) console.warn('⚠️ Keycloak init timeout (15s) — forzando isLoading=false')
      setIsLoading(false)
    }, 15_000)

    keycloak
      .init({
        onLoad,
        pkceMethod: 'S256',
        // ⚠️ NO activar `checkLoginIframe: true` mientras los apps corran
        // sobre HTTP (`*.localhost`). El iframe oculto de KC necesita leer
        // su propia cookie `KEYCLOAK_SESSION_IFRAME`; al estar en contexto
        // 3rd-party esa cookie exige `SameSite=None; Secure`, lo que no
        // funciona sobre HTTP. El iframe reporta «session changed»,
        // keycloak-js descarta el refresh_token y la siguiente llamada a
        // `updateToken` revienta con 400 Bad Request.
        // Consecuencia: la propagación cross-app de login/logout sigue
        // requiriendo recarga de la otra pestaña hasta que el ecosistema
        // sirva todos los frontends sobre HTTPS (en ese momento se puede
        // reactivar). La propagación cross-app de cambios de perfil
        // (idioma, etc.) sí funciona vía cookie `maya_session_overrides`.
        checkLoginIframe: false,
        enableLogging,
      })
      .then((authenticated) => {
        if (enableLogging) console.log('✅ Keycloak init completo. Autenticado:', authenticated)

        if (authenticated && keycloak.tokenParsed) {
          if (enableLogging) console.log('📝 Token parseado:', keycloak.tokenParsed)
          setUser(parseUserFromToken(keycloak.tokenParsed as Record<string, unknown>))
          setToken(keycloak.token ?? null)

          // Refresh fallido = sesión muerta → logout incondicional. Browsers
          // throttean setInterval en pestañas inactivas, así que onTokenExpired
          // (event-driven) actúa como respaldo cuando el interval no dispara.
          const handleRefreshFailure = (err: unknown): void => {
            if (enableLogging) console.warn('🔄 Refresh token fallo:', err)
            setUser(null)
            setToken(null)
            try {
              keycloak.logout()
            } catch {
              /* Adapter in inconsistent state — page reload will reset it. */
            }
          }

          keycloak.onTokenExpired = () => {
            keycloak.updateToken(30).catch(handleRefreshFailure)
          }

          // Start refresh interval only after successful auth to avoid calling
          // updateToken on an uninitialized adapter (race condition).
          intervalId = setInterval(() => {
            keycloak.updateToken(60)
              .then((refreshed) => {
                if (refreshed && keycloak.token) {
                  setToken(keycloak.token)
                  if (keycloak.tokenParsed) {
                    setUser(parseUserFromToken(keycloak.tokenParsed as Record<string, unknown>))
                  }
                }
                // Re-aplica overrides cross-subdomain por si otra app
                // (dashboard /profile) mutó algo en el ínterin.
                applyOverridesFromCookie()
              })
              .catch(handleRefreshFailure)
          }, 60_000)
        } else {
          if (enableLogging) console.warn('⚠️ No autenticado o sin token parseado')
        }
      })
      .catch((error) => {
        console.error('❌ Error en Keycloak init:', error)
      })
      .finally(() => {
        clearTimeout(loadingTimeoutId)
        if (enableLogging) console.log('🏁 Finalizando carga de autenticación')
        setIsLoading(false)
      })

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId)
      clearTimeout(loadingTimeoutId)
    }
  }, [keycloak, onLoad, enableLogging])

  // Logout broadcast cross-app: cuando otra pestaña/subdominio escribe
  // `loggedOut` en la cookie compartida, esta app también cierra sesión
  // al recuperar foco o al recibir el evento same-tab. Sirve para el
  // escenario «cierro sesión en dashboard y maya_logs sigue abierto».
  // Limitación: las pestañas en background NO se enteran hasta que el
  // usuario las visita (no hay broadcast en tiempo real sin HTTPS+iframe).
  const lastSeenLogoutRef = useRef<number>(0)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    // Al montar, registramos el último loggedOut visible como «ya
    // procesado» para evitar disparar logout en frío si la cookie
    // tenía un timestamp viejo (p. ej. logout del usuario anterior).
    lastSeenLogoutRef.current = readLogoutSignal()

    const onMaybeLogout = (): void => {
      const signal = readLogoutSignal()
      if (signal > lastSeenLogoutRef.current) {
        lastSeenLogoutRef.current = signal
        // Solo cierra sesión si esta app aún cree estar autenticada.
        // Si ya no hay token, ignora — el flujo de KC se encargará.
        if (keycloak.authenticated) {
          if (enableLogging) console.log('👋 Logout cross-app detectado — cerrando sesión local')
          keycloak.logout()
        }
      }
    }

    window.addEventListener('maya:profile-overrides', onMaybeLogout)
    document.addEventListener('visibilitychange', onMaybeLogout)

    return () => {
      window.removeEventListener('maya:profile-overrides', onMaybeLogout)
      document.removeEventListener('visibilitychange', onMaybeLogout)
    }
  }, [keycloak, enableLogging])

  const pendingAttributeUpdates = useRef<Map<string, Promise<string | null>>>(new Map())

  const updateUserAttribute = useCallback(async (name: string, value: string): Promise<string | null> => {
    if (!keycloak.token) return null

    // Dedup: concurrent calls with the same name+value share one in-flight request
    const dedupKey = `${name}:${value}`
    const pending = pendingAttributeUpdates.current.get(dedupKey)
    if (pending) return pending

    const request = (async (): Promise<string | null> => {
      const base = `${keycloak.authServerUrl?.replace(/\/$/, '')}/realms/${keycloak.realm}/account`

      const profileResp = await fetch(base, {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          Accept: 'application/json',
        },
      })

      if (!profileResp.ok) {
        const body = await profileResp.text().catch(() => '')
        console.error(
          `[maya-auth] updateUserAttribute(${name}): could not read account profile`,
          profileResp.status,
          body.slice(0, 200),
        )
        return null
      }

      const profile = await profileResp.json()
      const attributes = { ...(profile.attributes ?? {}), [name]: [value] }

      const updateResp = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...profile, attributes }),
      })

      if (!updateResp.ok) {
        const body = await updateResp.text().catch(() => '')
        console.error(
          `[maya-auth] updateUserAttribute(${name}): KC update failed`,
          updateResp.status,
          body.slice(0, 200),
        )
        return null
      }

      try {
        await keycloak.updateToken(-1)
        if (keycloak.token) {
          setToken(keycloak.token)
          if (keycloak.tokenParsed) {
            setUser(parseUserFromToken(keycloak.tokenParsed as Record<string, unknown>))
          }
          return keycloak.token
        }
      } catch {
        /* si falla el refresh, el atributo queda guardado y llegará en el próximo login */
      }
      return keycloak.token ?? null
    })()

    pendingAttributeUpdates.current.set(dedupKey, request)
    try {
      return await request
    } finally {
      pendingAttributeUpdates.current.delete(dedupKey)
    }
  }, [keycloak, enableLogging])

  const updateLocale = useCallback((locale: string) => updateUserAttribute('locale', locale), [updateUserAttribute])

  const login = useCallback(() => keycloak.login(), [keycloak])
  const logout = useCallback(() => {
    // 1. Broadcast cross-app: las otras pestañas leerán `loggedOut` al
    //    recuperar foco y cerrarán sesión también.
    signalLogoutAcrossApps()
    // 2. Limpia el perfil cacheado y los overrides ligados a la sesión
    //    de usuario (locale, employee_*). Preserva el `theme` para que un
    //    usuario distinto que se loguee no pierda la preferencia visual
    //    del navegador.
    clearCachedUserProfile()
    clearSessionScopedOverrides()
    // 3. Redirige a Keycloak para cerrar la sesión SSO.
    return keycloak.logout()
  }, [keycloak])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      keycloak,
      updateUserAttribute,
      updateLocale,
    }),
    [user, token, isLoading, login, logout, keycloak, updateUserAttribute, updateLocale],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

