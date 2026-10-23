import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../src/app.js'
import express from 'express'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { devOnly } from '../src/routes/auth.routes.js'
import { AUTH_COOKIE } from '../src/utils/authToken.js'
import { as, createUser, createUserWithPassword, prisma, resetDatabase } from './helpers/db.js'

const PASSWORD = 'Correct-Horse-42'
const SAFE_USER_KEYS = ['createdAt', 'email', 'id', 'isActive', 'name', 'role']
let admin, member

beforeEach(async () => {
  await resetDatabase()
  admin = await createUserWithPassword('ADMIN', PASSWORD)
  member = await createUserWithPassword('TEAM_MEMBER', PASSWORD)
})

after(() => prisma.$disconnect())

const login = (email, password) => request(app).post('/api/auth/login').send({ email, password })

// "neostats_session=<token>" from a login response.
function cookieFrom(res) {
  const header = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${AUTH_COOKIE}=`))
  assert.ok(header, 'response sets the session cookie')
  return header.split(';')[0]
}

const me = (cookie) => request(app).get('/api/auth/me').set('Cookie', cookie)

describe('POST /api/auth/login', () => {
  test('valid credentials: 200, safe user fields, HttpOnly SameSite=Strict cookie, no token in body', async () => {
    const res = await login(member.email, PASSWORD)
    assert.equal(res.status, 200)
    assert.deepEqual(Object.keys(res.body.data).sort(), SAFE_USER_KEYS)
    assert.equal(res.body.data.id, member.id)
    assert.ok(!JSON.stringify(res.body).includes('$2'), 'no bcrypt hash in the body')
    assert.ok(!('token' in res.body.data))

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith(`${AUTH_COOKIE}=`))
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Strict/i)
    assert.match(cookie, /Path=\//)
    assert.match(cookie, /Max-Age=\d+/)
  })

  test('email is normalized (case and surrounding spaces)', async () => {
    const res = await login(`  ${member.email.toUpperCase()} `, PASSWORD)
    assert.equal(res.status, 200)
  })

  test('wrong password and unknown email get the same generic 401', async () => {
    const wrong = await login(member.email, 'Wrong-password-1')
    const unknown = await login('nobody@test.local', PASSWORD)
    for (const res of [wrong, unknown]) {
      assert.equal(res.status, 401)
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS')
      assert.equal(res.body.error.message, 'Invalid email or password.')
      assert.equal(res.headers['set-cookie'], undefined)
    }
  })

  test('an account without a password cannot log in (generic 401)', async () => {
    const noPassword = await createUser('VIEWER')
    const res = await login(noPassword.email, PASSWORD)
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS')
  })

  test('a deactivated account gets no session (403 with right password, generic 401 otherwise)', async () => {
    const inactive = await createUserWithPassword('TEAM_MEMBER', PASSWORD, { isActive: false })
    const right = await login(inactive.email, PASSWORD)
    assert.equal(right.status, 403)
    assert.equal(right.body.error.code, 'ACCOUNT_DEACTIVATED')
    assert.equal(right.headers['set-cookie'], undefined)

    const wrong = await login(inactive.email, 'Wrong-password-1')
    assert.equal(wrong.status, 401)
    assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS')
  })

  test('malformed input is rejected with 400', async () => {
    const bodies = [
      {},
      { email: 'not-an-email', password: PASSWORD },
      { email: member.email },
      { email: member.email, password: '' },
      { email: member.email, password: 12345678 },
      { email: member.email, password: PASSWORD, role: 'ADMIN' }, // unknown fields
    ]
    for (const body of bodies) {
      const res = await request(app).post('/api/auth/login').send(body)
      assert.equal(res.status, 400, JSON.stringify(body))
      assert.equal(res.body.error.code, 'VALIDATION_ERROR')
    }
    const badJson = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad')
    assert.equal(badJson.status, 400)
  })

  test('a password longer than 72 bytes never matches (bcrypt truncation guard)', async () => {
    const long = await createUserWithPassword('VIEWER', 'a1'.repeat(36)) // exactly 72 bytes
    const res = await login(long.email, `${'a1'.repeat(36)}EXTRA`)
    assert.equal(res.status, 401)
  })
})

describe('GET /api/auth/me', () => {
  test('returns the current user from the database with safe fields only', async () => {
    const cookie = cookieFrom(await login(admin.email, PASSWORD))
    const res = await me(cookie)
    assert.equal(res.status, 200)
    assert.deepEqual(Object.keys(res.body.data).sort(), SAFE_USER_KEYS)
    assert.equal(res.body.data.role, 'ADMIN')
  })

  test('reflects role changes immediately (role comes from the DB, not the token)', async () => {
    const viewer = await createUserWithPassword('VIEWER', PASSWORD)
    const cookie = cookieFrom(await login(viewer.email, PASSWORD))
    await prisma.user.update({ where: { id: viewer.id }, data: { role: 'TEAM_MEMBER' } })
    const res = await me(cookie)
    assert.equal(res.body.data.role, 'TEAM_MEMBER')
  })

  test('missing credentials: 401', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, 'UNAUTHENTICATED')
  })

  test('invalid, tampered, wrongly signed, "none"-algorithm and expired tokens: 401', async () => {
    const valid = cookieFrom(await login(member.email, PASSWORD)).split('=')[1]
    const [header, payload] = valid.split('.')
    const claims = { sub: String(member.id), ver: 0 }
    const forgedPayload = Buffer.from(JSON.stringify({ ...claims, sub: String(admin.id) })).toString('base64url')

    const tokens = [
      'garbage',
      `${header}.${forgedPayload}.${valid.split('.')[2]}`, // payload swapped to the admin
      jwt.sign(claims, 'some-other-secret-that-is-long-enough-1234567890'),
      jwt.sign(claims, null, { algorithm: 'none' }),
      jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET),
      `${header}.${payload}.`, // signature stripped
    ]
    for (const token of tokens) {
      const res = await me(`${AUTH_COOKIE}=${token}`)
      assert.equal(res.status, 401, token)
    }
  })

  test('a token for a user that no longer exists: 401', async () => {
    const temp = await createUserWithPassword('VIEWER', PASSWORD)
    const cookie = cookieFrom(await login(temp.email, PASSWORD))
    await prisma.user.delete({ where: { id: temp.id } })
    assert.equal((await me(cookie)).status, 401)
  })

  test('an Authorization: Bearer header is not accepted (cookie-only auth)', async () => {
    const token = cookieFrom(await login(member.email, PASSWORD)).split('=')[1]
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    assert.equal(res.status, 401)
  })
})

describe('POST /api/auth/logout', () => {
  test('invalidates the session: the old cookie is rejected afterwards', async () => {
    const cookie = cookieFrom(await login(member.email, PASSWORD))
    assert.equal((await me(cookie)).status, 200)

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    assert.equal(res.status, 200)
    const cleared = res.headers['set-cookie'].find((c) => c.startsWith(`${AUTH_COOKIE}=`))
    assert.match(cleared, /Expires=Thu, 01 Jan 1970/)
    assert.match(cleared, /HttpOnly/i)

    // Replaying the old cookie (e.g. a stolen copy) no longer works anywhere.
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await request(app).get('/api/projects').set('Cookie', cookie)).status, 401)
  })

  test('signs the user out of every session (all tokens share the version)', async () => {
    const first = cookieFrom(await login(member.email, PASSWORD))
    const second = cookieFrom(await login(member.email, PASSWORD))
    await request(app).post('/api/auth/logout').set('Cookie', first)
    assert.equal((await me(second)).status, 401)
    // A fresh login works again.
    const third = cookieFrom(await login(member.email, PASSWORD))
    assert.equal((await me(third)).status, 200)
  })

  test('without a session it still answers 200 and clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    assert.equal(res.status, 200)
  })

  test('an old (already invalid) token cannot log out the current session', async () => {
    const old = cookieFrom(await login(member.email, PASSWORD))
    await request(app).post('/api/auth/logout').set('Cookie', old)
    const current = cookieFrom(await login(member.email, PASSWORD))
    await request(app).post('/api/auth/logout').set('Cookie', old)
    assert.equal((await me(current)).status, 200)
  })
})

describe('sessions of users who are changed by an Admin', () => {
  test('deactivation rejects previously issued credentials immediately', async () => {
    const cookie = cookieFrom(await login(member.email, PASSWORD))
    const res = await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({ isActive: false })
    assert.equal(res.status, 200)
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await request(app).get('/api/tasks').set('Cookie', cookie)).status, 401)
  })

  test('even reactivating the user does not revive the old token', async () => {
    const cookie = cookieFrom(await login(member.email, PASSWORD))
    await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({ isActive: false })
    await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({ isActive: true })
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await login(member.email, PASSWORD)).status, 200)
  })

  test('a password reset signs the user out and only the new password works', async () => {
    const cookie = cookieFrom(await login(member.email, PASSWORD))
    const res = await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({ password: 'Brand-new-pass-7' })
    assert.equal(res.status, 200)
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await login(member.email, PASSWORD)).status, 401)
    assert.equal((await login(member.email, 'Brand-new-pass-7')).status, 200)
  })
})

describe('CSRF / origin protection', () => {
  test('writes from a foreign Origin are refused with 403 before any change', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(as(admin))
      .set('Origin', 'http://evil.example')
      .send({ name: 'Should not exist' })
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'FORBIDDEN_ORIGIN')
    assert.equal(await prisma.project.count(), 0)
  })

  test('writes from the configured frontend origin are allowed', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(as(admin))
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Allowed' })
    assert.equal(res.status, 201)
  })

  test('CORS allows credentials only for the configured origin', async () => {
    const res = await request(app)
      .options('/api/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173')
    assert.equal(res.headers['access-control-allow-credentials'], 'true')
  })
})

describe('GET /api/auth/demo-accounts (development-only login picker)', () => {
  test('lists active accounts that can log in, with public fields only and no session needed', async () => {
    const pm1 = await createUserWithPassword('PROJECT_MANAGER', PASSWORD)
    const pm2 = await createUserWithPassword('PROJECT_MANAGER', PASSWORD)
    const inactive = await createUserWithPassword('VIEWER', PASSWORD, { isActive: false })
    const noPassword = await createUser('VIEWER')

    const res = await request(app).get('/api/auth/demo-accounts')
    assert.equal(res.status, 200)
    const ids = res.body.data.map((a) => a.id)
    for (const user of [admin, member, pm1, pm2]) assert.ok(ids.includes(user.id), 'active account listed')
    assert.ok(!ids.includes(inactive.id), 'inactive account hidden')
    assert.ok(!ids.includes(noPassword.id), 'account without password hidden')
    for (const account of res.body.data) {
      assert.deepEqual(Object.keys(account).sort(), ['email', 'id', 'name', 'role'])
    }
    assert.ok(!JSON.stringify(res.body).includes('$2'), 'no password hash')
    assert.equal(res.headers['set-cookie'], undefined)
  })

  test('picking an account grants nothing: login still needs the password, role comes from the DB', async () => {
    const res = await login(member.email, 'Wrong-password-1')
    assert.equal(res.status, 401)
    const ok = await request(app).post('/api/auth/login').send({ email: member.email, password: PASSWORD, role: 'ADMIN' })
    assert.equal(ok.status, 400, 'a role sent by the client is rejected')
    const cookie = cookieFrom(await login(member.email, PASSWORD))
    assert.equal((await me(cookie)).body.data.role, 'TEAM_MEMBER')
  })

  test('the route is hidden (404) when disabled, as in production', async () => {
    const prod = express()
    prod.get('/demo-accounts', devOnly(false), (req, res) => res.json({ leaked: true }))
    prod.use(errorHandler)
    const res = await request(prod).get('/demo-accounts')
    assert.equal(res.status, 404)
    assert.equal(res.body.leaked, undefined)
  })
})
