export type Brand<T, U extends string> = T & { readonly __brand: U };
