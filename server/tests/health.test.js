import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/health returns backend status without claiming a database connection', async () => {
  const res = await request(app).get('/api/health')

  assert.equal(res.status, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.data.status, 'ok')
  assert.equal(res.body.data.database, 'not_checked')
})

test('unknown API route returns a JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist')

  assert.equal(res.status, 404)
  assert.equal(res.body.success, false)
  assert.equal(res.body.error.code, 'NOT_FOUND')
})

test('malformed JSON body returns 400', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{"bad json"')

  assert.equal(res.status, 400)
  assert.equal(res.body.error.code, 'INVALID_JSON')
})

test('CORS allows the configured client origin', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')

  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173')
})
