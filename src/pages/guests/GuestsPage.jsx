import { useState, useEffect } from 'react'
import { Plus, Search, Star, Phone, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import GuestModal from './GuestModal'

const NATIONALITIES = [
  { code: 'KG', label: 'Кыргызстан' },
  { code: 'KZ', label: 'Казахстан' },
  { code: 'RU', label: 'Россия' },
  { code: 'UZ', label: 'Узбекистан' },
  { code: 'CN', label: 'Китай' },
  { code: 'OTHER', label: 'Другое' },
]

export default function GuestsPage() {
  const { hotel } = useAuthStore()
  const [guests, setGuests]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    if (!hotel) return
    setLoading(true)
    const { data } = await supabase
      .from('guests')
      .select('*, reservations(id)')
      .eq('hotel_id', hotel.id)
      .order('full_name')
    setGuests(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id])

  const filtered = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.passport?.includes(search)
  )

  const getNationalityLabel = (code) =>
    NATIONALITIES.find(n => n.code === code)?.label ?? code

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Гости</h1>
          <p className="text-sm text-slate-500 mt-0.5">{guests.length} в базе</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Новый гость
        </button>
      </div>

      {/* Поиск */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, телефону, email, паспорту..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <div className="text-4xl mb-3">👤</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {search ? 'Ничего не найдено' : 'Гостей пока нет'}
          </h3>
          {!search && (
            <p className="text-sm text-slate-500 mb-4">
              Гости добавляются автоматически при бронировании или вручную
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Гость</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Контакт</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Страна</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Визитов</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Баллы</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(guest => (
                <tr key={guest.id}
                  onClick={() => { setSelected(guest); setShowModal(true) }}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                        {guest.full_name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{guest.full_name}</div>
                        {guest.passport && (
                          <div className="text-xs text-slate-400">Паспорт: {guest.passport}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {guest.phone && (
                      <div className="flex items-center gap-1 text-slate-600 text-xs mb-0.5">
                        <Phone size={11} /> {guest.phone}
                      </div>
                    )}
                    {guest.email && (
                      <div className="text-xs text-slate-400">{guest.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <Globe size={12} />
                      {getNationalityLabel(guest.nationality)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {guest.reservations?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {guest.loyalty_pts > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 font-medium text-sm">
                        <Star size={13} fill="currentColor" />
                        {guest.loyalty_pts}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <GuestModal
          guest={selected}
          hotelId={hotel?.id}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
