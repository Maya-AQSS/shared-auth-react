import Keycloak from 'keycloak-js'
import type { AxiosInstance } from 'axios'
import type { KeycloakConfig } from './types'

export class AuthService {
  public keycloak: Keycloak

  constructor(config: KeycloakConfig) {
    this.keycloak = new Keycloak({
      url: config.url,
      realm: config.realm,
      clientId: config.clientId,
    })
  }

  /**
   * Adjunta `Authorization: Bearer <token>` a un objeto de headers si la sesión OIDC
   * está activa. Renueva el token si está a menos de 30s de expirar.
   */
  public async appendBearerAuthorization(headers: Record<string, string>): Promise<void> {
    if (!this.keycloak.authenticated) {
      return
    }
    await this.keycloak.updateToken(30).catch(() => {
      this.keycloak.login()
    })
    if (this.keycloak.token) {
      headers.Authorization = `Bearer ${this.keycloak.token}`
    }
  }

  /** Lanza el flujo de login Keycloak. */
  public triggerSignIn(): void {
    this.keycloak.login()
  }

  public setupAxios(axiosInstance: AxiosInstance) {
    // Interceptor: adjunta el Bearer token de Keycloak en cada request
    axiosInstance.interceptors.request.use(async (config) => {
      if (this.keycloak.authenticated) {
        // Renueva el token si expira en menos de 30 segundos
        await this.keycloak.updateToken(30).catch(() => this.keycloak.login())
        config.headers.Authorization = `Bearer ${this.keycloak.token}`
      }
      return config
    })

    // Interceptor: maneja 401 redirigiendo al login solo si no hay sesión activa
    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !this.keycloak.authenticated) {
          this.keycloak.login()
        }
        return Promise.reject(error)
      }
    )
  }
}
