import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Gera o hash bcrypt de uma senha em texto puro. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compara a senha informada com o hash armazenado. */
export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
