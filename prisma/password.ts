import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash bcrypt para uso nos scripts de seed/CLI.
 * Mantido em `prisma/` para não depender de `src/` no runtime do container.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
