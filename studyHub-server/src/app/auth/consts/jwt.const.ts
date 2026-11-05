import { UserRole } from '../../users/entities/user.entity'

export enum JWTEnvs {
  JWT_SECRET = 'JWT_SECRET',
}

export enum JWTToken {
  ACCESS_TOKEN_EXPIRE_IN = '6h',
  REFRESH_TOKEN_EXPIRE_IN = '1d',
}

export enum TokenKeys {
  ACCESS_TOKEN_KEY = 'accessToken',
  REFRESH_TOKEN_KEY = 'refreshToken',
}

export interface JwtPayload {
  userID: string
  userEmail: string
  role: UserRole
  iat: number
  exp: number
}
