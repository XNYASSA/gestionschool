import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'

export const useDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const dashboard = await apiClient.getDashboard()
      setData(dashboard)
      setError(null)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const refetch = useCallback(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { data, loading, error, refetch }
}
