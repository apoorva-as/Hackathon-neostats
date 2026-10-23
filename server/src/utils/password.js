// Password hashing with bcryptjs. Plaintext passwords are never stored or logged.
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

// bcrypt only looks at the first 72 bytes of a password. Longer inputs are
// rejected by validation so two different long passwords can never collide.
export const MAX_PASSWORD_BYTES = 72

export function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
}

// A real hash of a random string. Used when the email is unknown so a failed
// login takes about as long as a wrong password (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync(`dummy-${Math.random()}`, 10)

// `hash` may be null (account without a password): always returns false then,
// after spending the same bcrypt time.
export async function verifyPassword(plain, hash) {
  if (Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES) {
    await bcrypt.compare('x', DUMMY_HASH)
    return false
  }
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH)
    return false
  }
  return bcrypt.compare(plain, hash)
}
