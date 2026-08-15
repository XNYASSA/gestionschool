export default function StatCard({ icon, title, value, unit, color, percentage }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    red: 'from-red-50 to-red-100 text-red-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600'
  }

  return (
    <div className="stat-card">
      <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-3 w-fit mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <div className="flex items-baseline justify-between mt-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <span className="text-gray-500 text-sm ml-2">{unit}</span>
      </div>
      {percentage && (
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold text-green-600">{percentage}%</span> collecté
        </p>
      )}
    </div>
  )
}
