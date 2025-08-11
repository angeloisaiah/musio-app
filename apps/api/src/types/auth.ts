export interface JWTUser {
  sub: string;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTUser;
  }
}

export interface AuthenticatedRequest {
  user: JWTUser;
}
