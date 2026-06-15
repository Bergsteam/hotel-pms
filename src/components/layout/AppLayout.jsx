import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar onNavigate={() => {}} />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 sticky top-0 z-30">
          <button
            onClick={() => setOpen(true)}
            className="p-2 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Menu size={22} />
          </button>
          <span className="text-white font-semibold text-sm">Hotel PMS</span>
        </div>

        <Outlet />
      </main>
    </div>
  )
}
