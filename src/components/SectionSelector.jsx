import React from 'react'
import { sections } from '../data/mockData'

export default function SectionSelector({ selectedSection, onSelectSection }) {
  const sectionIcons = {
    francophone: '🇫🇷',
    anglophone: '🇬🇧',
    technique: '⚙️'
  }

  const sectionNames = {
    francophone: 'Système Francophone (MINESEC)',
    anglophone: 'Système Anglophone (GCE)',
    technique: 'Section Technique'
  }

  const sectionColors = {
    francophone: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
    anglophone: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
    technique: 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-6">Sélectionnez une Section</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.keys(sectionNames).map(section => (
          <button
            key={section}
            onClick={() => onSelectSection(section)}
            className={`bg-gradient-to-br ${sectionColors[section]} text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 ${
              selectedSection === section ? 'ring-4 ring-yellow-400 shadow-2xl' : ''
            }`}
          >
            <div className="text-4xl mb-3">{sectionIcons[section]}</div>
            <p className="text-lg font-bold">{sectionNames[section]}</p>
            <p className="text-white/70 text-sm mt-2">Cliquez pour accéder</p>
          </button>
        ))}
      </div>
    </div>
  )
}
