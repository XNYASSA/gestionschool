import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Imports des routes
import authRoutes from './routes/auth.js'
import sectionsRoutes from './routes/sections.js'
import classesRoutes from './routes/classes.js'
import eleveRoutes from './routes/eleves.js'
import fraisRoutes from './routes/frais.js'
import matiereRoutes from './routes/matieres.js'
import configurationsFraisRoutes from './routes/configurationsFrais.js'
import notesRoutes from './routes/notes.js'
import presenceRoutes from './routes/presences.js'
import personnelRoutes from './routes/personnel.js'
import dashboardRoutes from './routes/dashboard.js'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Rendre Prisma disponible sur req
app.use((req, res, next) => {
  req.prisma = prisma
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/sections', sectionsRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/eleves', eleveRoutes)
app.use('/api/frais', fraisRoutes)
app.use('/api/matieres', matiereRoutes)
app.use('/api/configurations-frais', configurationsFraisRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/presences', presenceRoutes)
app.use('/api/personnel', personnelRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API TDB École Privée' })
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Erreur serveur' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API serveur lancé sur http://localhost:${PORT}`)
  console.log(`📊 Frontend attendu sur http://localhost:5173`)
})
