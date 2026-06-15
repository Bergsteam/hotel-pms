import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import ReservationModal from './ReservationModal'

const SOURCE_LABEL = { direct: 'Прямое', booking: 'Booking.com', airbnb: 'Airbnb', other: 'Другое' }

export default function ReservationsPage() {
  const { hotel } = useAuthStore()
  const [reservations, setReservations] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    if (!hotel) return
    setLoading(true)
    const [{ data: res }, { data: rm }] = await Promise.all([
      supabase.from('reservations')
        .select('*, rooms(number, type)')
        .eq('hotel_id', hotel.id)
        .order('check_in', { ascending: false })
        .limit(100),
      supabase.from('rooms').select('id, number, type, price_per_night').eq('hotel_id', hotel.id).order('number'),
    ])
    setReservations(res ?? [])
    setRooms(rm ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id])

  const filtered = reservations.filter(r =>
    r.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    r.rooms?.number?.includes(search) ||
    r.guest_phone?.includes(search)
  )

  const fmt = (d) => d ? format(new Date(d), 'd MMM', { locale: ru }) : '—'
  const nights = (r) => {
    const ms = new Date(r.check_out) - new Date(r.check_in)
    return Math.round(ms / 86400000)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Бронирования</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reservations.length} всего</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Новое бронирование
        </button>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по гостю, номеру комнаты, телефону..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Гость</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Номер</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Заезд — Выезд</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Ночей</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Сумма</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Источник</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  {search ? 'Ничего не найдено' : 'Бронирований пока нет'}
                </td>
              </tr>
            ) : filtered.map(r => (
              <tr
                key={r.id}
                onClick={() => { setSelected(r); setShowModal(true) }}
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{r.guest_name}</div>
                  {r.guest_phone && <div className="text-xs text-slate-400">{r.guest_phone}</div>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  № {r.rooms?.number}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {fmt(r.check_in)} — {fmt(r.check_out)}
                </td>
                <td className="px-4 py-3 text-slate-600">{nights(r)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.total_amount
                    ? new Intl.NumberFormat('ru-KG', { style: 'currency', currency: 'KGS', maximumFractionDigits: 0 }).format(r.total_amount)
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {SOURCE_LABEL[r.source] ?? r.source}
                </td>
                <td className="px-4 py-3">
                  <Badge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ReservationModal
          reservation={selected}
          rooms={rooms}
          hotelId={hotel?.id}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
