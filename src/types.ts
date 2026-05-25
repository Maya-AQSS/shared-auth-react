export interface AuthUser {
  sub: string
  email: string
  name: string
  preferred_username: string
  locale?: string
}

export interface KeycloakConfig {
  url: string
  realm: string
  clientId: string
}
