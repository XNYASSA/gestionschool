import React from 'react'

export default function ClassSelector({ section, selectedClass, onSelectClass, classes }) {
  const sectionInfo = {
    FRANCOPHONE: { name: '🇫🇷 Francophone', color: 'from-blue-600 to-blue-700' },
    ANGLOPHONE: { name: '🇬🇧 Anglophone', color: 'from-green-600 to-green-700' },
    TECHNIQUE: { name: '⚙️ Technique', color: 'from-orange-600 to-orange-700' }
  }

  const info = sectionInfo[section] || { name: 'Sélectionner une classe', color: 'from-gray-600 to-gray-700' }

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-r ${info.color} text-white rounded-lg p-4`}>
        <p className="text-sm text-white/80">Section sélectionnée:</p>
        <p className="text-xl font-bold">{info.name}</p>
      </div>

      <h3 className="text-lg font-bold text-white">Sélectionnez une Classe</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {classes.map(cls => (
          <button
            key={cls}
            onClick={() => onSelectClass(cls)}
            className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
              selectedClass === cls
                ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-300 shadow-lg'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {cls}
          </button>
        ))}
      </div>
    </div>
  )
}
