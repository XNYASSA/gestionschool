import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import DashboardOwnerEnhanced from './DashboardOwnerEnhanced'
import DashboardDirector from './DashboardDirector'
import DashboardSecretary from './DashboardSecretary'
import DashboardTeacher from './DashboardTeacher'

export default function DashboardRole({ filters }) {
  const { user } = useContext(AuthContext)

  switch (user?.role) {
    case 'owner':
      return <DashboardOwnerEnhanced filters={filters} />
    case 'director':
      return <DashboardDirector filters={filters} />
    case 'secretary':
      return <DashboardSecretary filters={filters} />
    case 'teacher':
      return <DashboardTeacher filters={filters} />
    default:
      return <DashboardOwnerEnhanced filters={filters} />
  }
}
