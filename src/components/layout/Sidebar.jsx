import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BedDouble, CalendarDays, Users,
  LogOut, Hotel, Settings, Sparkles, Wallet, BarChart2, ChefHat
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/rooms',        icon: BedDouble,       label: 'Карта номеров' },
  { to: '/reservations', icon: CalendarDays,    label: 'Бронирования' },
  { to: '/guests',        icon: Users,     label: 'Гости' },
  { to: '/housekeeping', icon: Sparkles, label: 'Горничные' },
  { to: '/finance',    icon: Wallet,    label: 'Финансы' },
  { to: '/analytics', icon: BarChart2,  label: 'Аналитика' },
  { to: '/staff',     icon: Users,      label: 'Персонал' },
  { to: '/kitchen',   icon: ChefHat,   label: 'Кухня' },
  { to: '/settings',  icon: Settings,  label: 'Настройки' },
]

const roleLabel = {
  owner:       'Владелец',
  manager:     'Менеджер',
  reception:   'Ресепшн',
  housekeeper: 'Горничная',
  chef:        'Повар',
}

export default function Sidebar() {
  const { hotel, profile, signOut } = useAuthStore()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Лого и название отеля */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Hotel size={20} />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">
              {hotel?.name ?? 'Hotel PMS'}
            </div>
            <div className="text-xs text-slate-400">{hotel?.city ?? ''}</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Профиль и выход */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-medium">
            {profile?.full_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.full_name}</div>
            <div className="text-xs text-slate-400">{roleLabel[profile?.role]}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  )
}
