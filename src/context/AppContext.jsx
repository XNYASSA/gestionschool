import React, { createContext, useState } from 'react'
import { students, grades, attendance, staff, paymentMethods } from '../data/mockData'

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [studentsData, setStudentsData] = useState(students)
  const [gradesData, setGradesData] = useState(grades)
  const [attendanceData, setAttendanceData] = useState(attendance)
  const [staffData, setStaffData] = useState(staff)

  // Enregistrer un paiement
  const recordPayment = (studentId, amount, method) => {
    setStudentsData(prev => prev.map(student => {
      if (student.id === studentId) {
        const newPaid = student.paid + amount
        const remaining = student.registrationFee - newPaid
        let newStatus = "Impayé"
        if (remaining <= 0) {
          newStatus = "Soldé"
        } else if (newPaid > 0) {
          newStatus = "Partiel"
        }
        return { ...student, paid: newPaid, status: newStatus }
      }
      return student
    }))
  }

  // Mettre à jour une note
  const updateGrade = (studentId, subject, newGrade) => {
    setGradesData(prev => prev.map(g => {
      if (g.studentId === studentId && g.subject === subject) {
        return { ...g, grade: newGrade }
      }
      return g
    }))
  }

  // Statistiques globales
  const getStatistics = () => {
    const totalStudents = studentsData.length
    const totalFeesCollected = studentsData.reduce((sum, s) => sum + s.paid, 0)
    const totalFeesExpected = studentsData.reduce((sum, s) => sum + s.registrationFee, 0)
    const totalFeesRemaining = totalFeesExpected - totalFeesCollected
    const totalPersonnelCost = staffData.reduce((sum, s) => sum + s.salary, 0)
    const attendanceRate = attendanceData.length > 0
      ? ((attendanceData.reduce((sum, a) => sum + (a.presentDays / a.totalDays), 0) / attendanceData.length) * 100).toFixed(1)
      : 0

    // Élèves en échec (moyenne < 10)
    const failedStudents = studentsData.filter(student => {
      const studentGrades = gradesData.filter(g => g.studentId === student.id)
      if (studentGrades.length === 0) return false
      const weighted = studentGrades.reduce((sum, g) => sum + (g.grade * g.coefficient), 0) /
                      studentGrades.reduce((sum, g) => sum + g.coefficient, 0)
      return weighted < 10
    })

    return {
      totalStudents,
      totalFeesCollected,
      totalFeesExpected,
      totalFeesRemaining,
      percentageCollected: ((totalFeesCollected / totalFeesExpected) * 100).toFixed(1),
      totalPersonnelCost,
      attendanceRate,
      failedStudents: failedStudents.length,
      impayedCount: studentsData.filter(s => s.status === "Impayé").length
    }
  }

  // Calculer la moyenne pondérée d'un élève
  const getStudentAverage = (studentId) => {
    const studentGrades = gradesData.filter(g => g.studentId === studentId)
    if (studentGrades.length === 0) return 0
    const weighted = studentGrades.reduce((sum, g) => sum + (g.grade * g.coefficient), 0) /
                    studentGrades.reduce((sum, g) => sum + g.coefficient, 0)
    return weighted.toFixed(2)
  }

  // Obtenir la mention d'un élève
  const getStudentMention = (average) => {
    if (average < 10) return "Insuffisant"
    if (average < 13) return "Passable"
    if (average < 15) return "Assez Bien"
    if (average < 18) return "Bien"
    return "Très Bien"
  }

  // Top 5 meilleurs élèves
  const getTopStudents = () => {
    return studentsData
      .map(student => ({
        ...student,
        average: parseFloat(getStudentAverage(student.id))
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
  }

  // Classement des élèves par classe
  const getClassRanking = (className) => {
    return studentsData
      .filter(s => s.class === className)
      .map(student => ({
        ...student,
        average: parseFloat(getStudentAverage(student.id))
      }))
      .sort((a, b) => b.average - a.average)
      .map((student, index) => ({ ...student, rank: index + 1 }))
  }

  // Taux de présence d'un élève
  const getStudentAttendanceRate = (studentId) => {
    const record = attendanceData.find(a => a.studentId === studentId)
    if (!record) return 0
    return ((record.presentDays / record.totalDays) * 100).toFixed(1)
  }

  const value = {
    studentsData,
    setStudentsData,
    gradesData,
    setGradesData,
    attendanceData,
    setAttendanceData,
    staffData,
    recordPayment,
    updateGrade,
    getStatistics,
    getStudentAverage,
    getStudentMention,
    getTopStudents,
    getClassRanking,
    getStudentAttendanceRate,
    paymentMethods
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
