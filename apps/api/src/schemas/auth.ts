import { Type } from '@sinclair/typebox';

export const SignupSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
});

export const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});

export const AuthResponseSchema = Type.Object({
  user: Type.Object({
    id: Type.String(),
    name: Type.String(),
    email: Type.String(),
  }),
  token: Type.String(),
});
