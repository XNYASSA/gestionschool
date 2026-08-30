const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class APIClient {
  constructor() {
    this.token = localStorage.getItem('token')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    })

    if (response.status === 401) {
      // Un 401 sur la tentative de connexion elle-même = identifiants invalides,
      // pas une session expirée : il n'y a pas encore de session à ce stade.
      if (endpoint === '/auth/login') {
        const error = await response.json().catch(() => ({ error: 'Identifiants invalides' }))
        throw new Error(error.error || 'Identifiants invalides')
      }
      this.setToken(null)
      window.location.href = '/'
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }))
      throw new Error(error.error || `Erreur ${response.status}`)
    }

    return response.json()
  }

  // AUTH
  async login(email, motDePasse) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse })
    })
    this.setToken(data.token)
    return data.utilisateur
  }

  async logout() {
    this.setToken(null)
  }

  async me() {
    return this.request('/auth/me')
  }

  // ECOLES
  async getEcoles() {
    return this.request('/ecoles')
  }

  async getEcole(id) {
    return this.request(`/ecoles/${id}`)
  }

  async createEcole(data) {
    return this.request('/ecoles', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateEcole(id, data) {
    return this.request(`/ecoles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteEcole(id) {
    return this.request(`/ecoles/${id}`, {
      method: 'DELETE'
    })
  }

  // ANOMALIES
  async getAnomalies() {
    return this.request('/anomalies')
  }

  // SECTIONS
  async getSections() {
    return this.request('/sections')
  }

  async getSection(id) {
    return this.request(`/sections/${id}`)
  }

  async createSection(nom, emoji, ordre = 0) {
    return this.request('/sections', {
      method: 'POST',
      body: JSON.stringify({ nom, emoji, ordre })
    })
  }

  async updateSection(id, data) {
    return this.request(`/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteSection(id) {
    return this.request(`/sections/${id}`, {
      method: 'DELETE'
    })
  }

  // CLASSES
  async getClasses() {
    return this.request('/classes')
  }

  async getClasse(id) {
    return this.request(`/classes/${id}`)
  }

  async createClasse(nom, ecoleId, niveau) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify({ nom, ecoleId, niveau })
    })
  }

  async updateClasse(id, data) {
    return this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteClasse(id) {
    return this.request(`/classes/${id}`, {
      method: 'DELETE'
    })
  }

  // ELEVES
  async getEleves() {
    return this.request('/eleves')
  }

  async getEleve(id) {
    return this.request(`/eleves/${id}`)
  }

  async createEleve(data) {
    return this.request('/eleves', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateEleve(id, data) {
    return this.request(`/eleves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteEleve(id) {
    return this.request(`/eleves/${id}`, {
      method: 'DELETE'
    })
  }

  // FRAIS
  async getFrais() {
    return this.request('/frais')
  }

  async enregistrerPaiement(eleveId, montant, modePayement) {
    return this.request('/frais/enregistrer-paiement', {
      method: 'POST',
      body: JSON.stringify({ eleveId, montant, modePayement })
    })
  }

  async validerPaiement(fraisId, statutValidation) {
    return this.request(`/frais/${fraisId}/valider`, {
      method: 'PUT',
      body: JSON.stringify({ statutValidation })
    })
  }

  async getPaiements() {
    return this.request('/frais/paiements')
  }

  // NOTES
  async getNotes() {
    return this.request('/notes')
  }

  async createNote(eleveId, ecmId, trimestre, valeur, observation) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify({ eleveId, ecmId, trimestre, valeur, observation })
    })
  }

  async validerNote(noteId) {
    return this.request(`/notes/${noteId}/valider`, {
      method: 'PUT'
    })
  }

  // PRESENCES
  async getPresences(filtres = {}) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))
    ).toString()
    return this.request(`/presences${params ? `?${params}` : ''}`)
  }

  async enregistrerPresence(eleveId, classeId, date, statut) {
    return this.request('/presences', {
      method: 'POST',
      body: JSON.stringify({ eleveId, classeId, date, statut })
    })
  }

  // PERSONNEL
  async getPersonnel() {
    return this.request('/personnel')
  }

  async getPersonnelById(id) {
    return this.request(`/personnel/${id}`)
  }

  async createPersonnel(data) {
    return this.request('/personnel', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updatePersonnel(id, data) {
    return this.request(`/personnel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async togglePersonnelStatut(id) {
    return this.request(`/personnel/${id}/toggle-statut`, {
      method: 'PUT'
    })
  }

  async deletePersonnel(id) {
    return this.request(`/personnel/${id}`, {
      method: 'DELETE'
    })
  }

  // MATIERES
  async getMatieres() {
    return this.request('/matieres')
  }

  async getMatieresByEcole(ecoleId) {
    return this.request(`/matieres/ecole/${ecoleId}`)
  }

  async createMatiere(nom, ecoleId, coefficient) {
    return this.request('/matieres', {
      method: 'POST',
      body: JSON.stringify({ nom, ecoleId, coefficient })
    })
  }

  async updateMatiere(id, data) {
    return this.request(`/matieres/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteMatiere(id) {
    return this.request(`/matieres/${id}`, {
      method: 'DELETE'
    })
  }

  // CONFIGURATIONS FRAIS
  async getConfigurationsFrais() {
    return this.request('/configurations-frais')
  }

  async getConfigurationFraisByEcole(ecoleId) {
    return this.request(`/configurations-frais/ecole/${ecoleId}`)
  }

  async createConfigurationFrais(data) {
    return this.request('/configurations-frais', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateConfigurationFrais(id, data) {
    return this.request(`/configurations-frais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async addTranche(configId, montant, dateLimite) {
    return this.request(`/configurations-frais/${configId}/tranches`, {
      method: 'POST',
      body: JSON.stringify({ montant, dateLimite })
    })
  }

  async updateTranche(configId, trancheNum, montant, dateLimite) {
    return this.request(`/configurations-frais/${configId}/tranches/${trancheNum}`, {
      method: 'PUT',
      body: JSON.stringify({ montant, dateLimite })
    })
  }

  async deleteTranche(configId, trancheNum) {
    return this.request(`/configurations-frais/${configId}/tranches/${trancheNum}`, {
      method: 'DELETE'
    })
  }

  // DEPENSES
  async getDepenses() {
    return this.request('/depenses')
  }

  async getDepensesByCategorie(categorie) {
    return this.request(`/depenses/categorie/${categorie}`)
  }

  async createDepense(data) {
    return this.request('/depenses', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateDepense(id, data) {
    return this.request(`/depenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteDepense(id) {
    return this.request(`/depenses/${id}`, {
      method: 'DELETE'
    })
  }

  async getDepenseStats() {
    return this.request('/depenses/stats/summary')
  }

  // UTILISATEURS
  async getUtilisateurs() {
    return this.request('/utilisateurs')
  }

  async getUtilisateurById(id) {
    return this.request(`/utilisateurs/${id}`)
  }

  async createUtilisateur(data) {
    return this.request('/utilisateurs', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateUtilisateur(id, data) {
    return this.request(`/utilisateurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async toggleUtilisateurStatut(id) {
    return this.request(`/utilisateurs/${id}/toggle-statut`, {
      method: 'PUT'
    })
  }

  async resetPasswordUtilisateur(id, adminEmail, adminMotDePasse) {
    return this.request(`/utilisateurs/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ adminEmail, adminMotDePasse })
    })
  }

  async impersonateUtilisateur(id, adminEmail, adminMotDePasse) {
    return this.request(`/utilisateurs/${id}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ adminEmail, adminMotDePasse })
    })
  }

  async deleteUtilisateur(id) {
    return this.request(`/utilisateurs/${id}`, {
      method: 'DELETE'
    })
  }

  async assignEcoleToUtilisateur(utilisateurId, ecoleId, role) {
    return this.request(`/utilisateurs-ecoles/${utilisateurId}/assign-ecole`, {
      method: 'POST',
      body: JSON.stringify({ ecoleId, role })
    })
  }

  async removeEcoleFromUtilisateur(utilisateurId, ecoleId) {
    return this.request(`/utilisateurs-ecoles/${utilisateurId}/ecoles/${ecoleId}`, {
      method: 'DELETE'
    })
  }

  async getMasseSalariale(ecoleId) {
    return this.request(`/utilisateurs/ecole/${ecoleId}/masse-salariale`)
  }

  async getEnseignantsHoraires(ecoleId) {
    return this.request(`/utilisateurs/ecole/${ecoleId}/enseignants-horaires`)
  }

  async updateTarifHoraire(utilisateurId, tarifHoraire) {
    return this.request(`/utilisateurs/${utilisateurId}/tarif-horaire`, {
      method: 'PUT',
      body: JSON.stringify({ tarifHoraire })
    })
  }

  async getSaisiesQuotidiennes(ecoleId, params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/saisies-quotidiennes/${ecoleId}${query ? `?${query}` : ''}`)
  }

  async validerSaisieQuotidienne(saisieId) {
    return this.request(`/saisies-quotidiennes/${saisieId}/valider`, {
      method: 'PATCH'
    })
  }

  async creerSaisieQuotidienne(ecoleId, data) {
    return this.request(`/saisies-quotidiennes/${ecoleId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateProfil(nom, email) {
    return this.request('/utilisateurs/profil/moi', {
      method: 'PUT',
      body: JSON.stringify({ nom, email })
    })
  }

  async changerMotDePasse(ancienMotDePasse, nouveauMotDePasse) {
    return this.request('/utilisateurs/profil/changer-mot-de-passe', {
      method: 'PUT',
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse })
    })
  }

  // DASHBOARD
  async getDashboard() {
    return this.request('/dashboard')
  }

  // CAHIER DE TEXTES / LEÇONS
  async getProgressionLecons() {
    return this.request('/lecons/progression')
  }

  async getMesEcm() {
    return this.request('/lecons/mes-ecm')
  }

  async getLecons(ecmId) {
    return this.request(`/lecons?ecmId=${ecmId}`)
  }

  async createLecon(data) {
    return this.request('/lecons', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateObjectifLecons(ecmId, nombreLeconsPrevues) {
    return this.request(`/lecons/ecm/${ecmId}/objectif`, {
      method: 'PUT',
      body: JSON.stringify({ nombreLeconsPrevues })
    })
  }

  // RH : EMPLOI DU TEMPS & PRÉSENCE DU PERSONNEL
  async getEmployesEcole(ecoleId) {
    return this.request(`/rh/employes?ecoleId=${ecoleId}`)
  }

  async getHoraires(ecoleId, utilisateurId) {
    const params = new URLSearchParams({ ecoleId, ...(utilisateurId && { utilisateurId }) })
    return this.request(`/rh/horaires?${params}`)
  }

  async upsertHoraire(data) {
    return this.request('/rh/horaires', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async deleteHoraire(id) {
    return this.request(`/rh/horaires/${id}`, {
      method: 'DELETE'
    })
  }

  async getPresencesPersonnel(ecoleId, date) {
    const params = new URLSearchParams({ ecoleId, ...(date && { date }) })
    return this.request(`/rh/presences?${params}`)
  }

  async upsertPresencePersonnel(data) {
    return this.request('/rh/presences', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getResumeRH(ecoleId) {
    return this.request(`/rh/resume${ecoleId ? `?ecoleId=${ecoleId}` : ''}`)
  }

  // BULLETINS
  async genererBulletins(data) {
    return this.request('/bulletins/generer', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getBulletinData(bulletinId) {
    return this.request(`/bulletins/${bulletinId}/data`)
  }

  // AFFECTATIONS ENSEIGNANT / CLASSE / MATIÈRE
  async getAffectations(ecoleId) {
    return this.request(`/affectations?ecoleId=${ecoleId}`)
  }

  async createAffectation(data) {
    return this.request('/affectations', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async deleteAffectation(id) {
    return this.request(`/affectations/${id}`, {
      method: 'DELETE'
    })
  }

  // ANOMALIES : rapprochement Économat / Secrétaire / Principal-Directrice
  async getRapportAnomalies(ecoleId, period, date) {
    const params = new URLSearchParams({ ecoleId, period, ...(date && { date }) })
    return this.request(`/anomalies/rapport?${params}`)
  }
}

export const apiClient = new APIClient()
