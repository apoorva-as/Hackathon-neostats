// Builds and configures the Express app without starting it,
// so tests can import it directly.
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { checkOrigin } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import apiRoutes from './routes/index.js'

const app = express()

app.disable('x-powered-by')
// credentials: true lets the browser send the HttpOnly session cookie, but
// only from CLIENT_ORIGIN (never "*").
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
app.use(checkOrigin(env.CLIENT_ORIGIN))
app.use(express.json({ limit: '100kb' }))

app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
