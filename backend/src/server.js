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
import depensesRoutes from './routes/depenses.js'
import utilisateursRoutes from './routes/utilisateurs.js'
import dashboardRoutes from './routes/dashboard.js'

// Routes multi-écoles (Phase 2)
import ecolesRoutes from './routes/ecoles.js'
import utilisateursecolesRoutes from './routes/utilisateurs-ecoles.js'
import saisiesQuotidiennesRoutes from './routes/saisies-quotidiennes.js'
import anomaliesRoutes from './routes/anomalies.js'
import annoncesRoutes from './routes/annonces.js'
import bulletinsRoutes from './routes/bulletins.js'
import leconsRoutes from './routes/lecons.js'
import rhRoutes from './routes/rh.js'
import affectationsRoutes from './routes/affectations.js'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Origin non autorisée par CORS'))
    }
  },
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
app.use('/api/depenses', depensesRoutes)
app.use('/api/utilisateurs', utilisateursRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Routes multi-écoles (Phase 2)
app.use('/api/ecoles', ecolesRoutes)
app.use('/api/utilisateurs-ecoles', utilisateursecolesRoutes)
app.use('/api/saisies-quotidiennes', saisiesQuotidiennesRoutes)
app.use('/api/anomalies', anomaliesRoutes)
app.use('/api/annonces', annoncesRoutes)
app.use('/api/bulletins', bulletinsRoutes)
app.use('/api/lecons', leconsRoutes)
app.use('/api/rh', rhRoutes)
app.use('/api/affectations', affectationsRoutes)

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
