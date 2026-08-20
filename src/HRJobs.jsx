export default function HRJobs() {
  return (
    <div className="space-y-6">
      {/* Header with Add Job Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">İlan Yönetimi</h1>
          <p className="text-sm text-slate-600 mt-1">İş ilanlarınızı oluşturun ve yönetin</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>İlan Ekle</span>
        </button>
      </div>

      {/* Job List Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-700 mb-2">İlanlar burada listelenecek</h3>
          <p className="text-slate-500">Henüz hiç ilan eklenmemiş. Yukarıdaki butonu kullanarak yeni ilan ekleyebilirsiniz.</p>
        </div>
      </div>
    </div>
  )
}
