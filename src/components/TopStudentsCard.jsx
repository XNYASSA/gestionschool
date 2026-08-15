import { Trophy } from 'lucide-react'

export default function TopStudentsCard({ students }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 slide-in">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
        Top 5 Meilleurs Élèves
      </h3>
      <div className="space-y-3">
        {students.map((student, index) => (
          <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{medals[index]}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-gray-500">{student.level} • {student.system}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-blue-600">{student.average}/20</p>
              <p className="text-xs text-gray-500">Moyenne</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
