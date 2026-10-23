// Builds and configures the Express app without starting it,
// so tests can import it directly.
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import apiRoutes from './routes/index.js'

const app = express()

app.use(cors({ origin: env.CLIENT_ORIGIN }))
app.use(express.json())

app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
