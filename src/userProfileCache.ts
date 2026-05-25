/**
 * Caché en localStorage del perfil del usuario activo.
 *
 * Cada app del ecosistema persiste el último `GET /api/v1/me` aquí para:
 *   - Hidratar el contexto antes de que el fetch termine (anti-flash).
 *   - Permitir que `useUserLocaleSync` lea el locale sin tocar la red.
 *
 * La forma del perfil varía ligeramente entre apps (DMS añade `permissions`,
 * `teams`, etc.); por eso el tipo aquí es deliberadamente laxo y cada caller
 * lo refina con su `MeProfile` local.
 */

export const USER_PROFILE_STORAGE_KEY = 'maya_user_profile'
export const LOCALE_STORAGE_KEY = 'locale'

export type CachedUserProfile = {
  id?: string
  email?: string | null
  name?: string | null
  locale?: string
  permissions?: string[]
  [key: string]: unknown
}

/**
 * Lee el perfil cacheado en localStorage.
 * Devuelve `null` si no existe o el JSON está corrupto.
 */
export function readCachedUserProfile(): CachedUserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CachedUserProfile
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persiste el perfil en localStorage. Llamar tras un `fetchMe()` exitoso.
 */
export function writeCachedUserProfile(profile: CachedUserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* localStorage llena o no disponible — no crítico para la UI. */
  }
}

/**
 * Actualiza solo el campo `locale` del perfil cacheado sin reescribir todo
 * el blob (preserva el resto de campos por si el caller no los conoce).
 */
export function updateCachedUserProfileLocale(locale: string): void {
  const current = readCachedUserProfile()
  if (!current) return
  writeCachedUserProfile({ ...current, locale })
}

/**
 * Limpia el perfil y el locale activo. Llamar al hacer logout.
 *
 * No barre otras keys del localStorage (preferencias de UI, bookmarks,
 * etc.) para no destruir estado del usuario que no depende de la sesión.
 */
export function clearCachedUserProfile(): void {
  try {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
    localStorage.removeItem(LOCALE_STORAGE_KEY)
  } catch {
    /* idem */
  }
}
