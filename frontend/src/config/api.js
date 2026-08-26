// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const API_ENDPOINTS = {
  anomalies: `${API_BASE_URL}/api/anomalies`,
  ecoles: `${API_BASE_URL}/api/ecoles`,
  saisiesQuotidiennes: `${API_BASE_URL}/api/saisies-quotidiennes`,
  annonces: `${API_BASE_URL}/api/annonces`,
  bulletins: `${API_BASE_URL}/api/bulletins`,
  utilisateurs: `${API_BASE_URL}/api/utilisateurs-ecoles`
}

export default API_ENDPOINTS
