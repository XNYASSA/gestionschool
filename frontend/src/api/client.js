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
      // Token invalide ou expiré
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
  async login(email, motDePasse, roleSelected = null) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse, roleSelected })
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

  async createClasse(nom, section, sectionId, niveau) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify({ nom, section, sectionId, niveau })
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

  // NOTES
  async getNotes() {
    return this.request('/notes')
  }

  async createNote(eleveId, ecmId, trimestre, valeur) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify({ eleveId, ecmId, trimestre, valeur })
    })
  }

  async validerNote(noteId) {
    return this.request(`/notes/${noteId}/valider`, {
      method: 'PUT'
    })
  }

  // PRESENCES
  async getPresences() {
    return this.request('/presences')
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

  async getMatieresBySection(sectionId) {
    return this.request(`/matieres/section/${sectionId}`)
  }

  async createMatiere(nom, sectionId, coefficient) {
    return this.request('/matieres', {
      method: 'POST',
      body: JSON.stringify({ nom, sectionId, coefficient })
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

  async getConfigurationFraisBySection(sectionId) {
    return this.request(`/configurations-frais/section/${sectionId}`)
  }

  async createConfigurationFrais(sectionId, montantInscription, montantFraisTotal, tranches) {
    return this.request('/configurations-frais', {
      method: 'POST',
      body: JSON.stringify({ sectionId, montantInscription, montantFraisTotal, tranches })
    })
  }

  async updateConfigurationFrais(id, data) {
    return this.request(`/configurations-frais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async updateTranche(configId, trancheNum, montant) {
    return this.request(`/configurations-frais/${configId}/tranches/${trancheNum}`, {
      method: 'PUT',
      body: JSON.stringify({ montant })
    })
  }

  // DEPENSES
  async getDepenses() {
    return this.request('/depenses')
  }

  async getDepensesByCategorie(categorie) {
    return this.request(`/depenses/categorie/${categorie}`)
  }

  async createDepense(description, categorie, montant, dateDepense) {
    return this.request('/depenses', {
      method: 'POST',
      body: JSON.stringify({ description, categorie, montant, dateDepense })
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

  // DASHBOARD
  async getDashboard() {
    return this.request('/dashboard')
  }
}

export const apiClient = new APIClient()
