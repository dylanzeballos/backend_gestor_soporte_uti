export type JwtTokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: number;
  email: string;
  type: JwtTokenType;
  jti?: string;
}
