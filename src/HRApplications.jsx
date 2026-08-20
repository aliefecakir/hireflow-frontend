export default function HRApplications() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Başvurular</h1>
        <p className="text-sm text-slate-600 mt-1">Tüm iş başvurularını görüntüleyin ve yönetin</p>
      </div>

      {/* Applications Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-700 mb-2">Başvurular buraya gelecek</h3>
          <p className="text-slate-500">Henüz hiç başvuru bulunmuyor.</p>
        </div>
      </div>
    </div>
  )
}
