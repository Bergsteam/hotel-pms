import { useState, useEffect } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import RoomCard from './RoomCard'
import RoomModal from './RoomModal'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

const STATUS_FILTERS = [
  { value: 'all',      label: 'Все' },
  { value: 'free',     label: 'Свободные' },
  { value: 'occupied', label: 'Занятые' },
  { value: 'cleaning', label: 'Уборка' },
  { value: 'checkout', label: 'Выезд' },
  { value: 'blocked',  label: 'Блок' },
]

export default function RoomsPage() {
  const { hotel } = useAuthStore()
  const [floors, setFloors] = useState([])
  const [rooms, setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    if (!hotel) return
    setLoading(true)
    const [{ data: f }, { data: r }] = await Promise.all([
      supabase.from('floors').select('*').eq('hotel_id', hotel.id).order('number'),
      supabase.from('rooms').select('*').eq('hotel_id', hotel.id).order('number'),
    ])
    setFloors(f ?? [])
    setRooms(r ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()

    // Real-time обновления статусов
    const channel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms',
        filter: `hotel_id=eq.${hotel?.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
        } else {
          load()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [hotel?.id])

  const stats = {
    total:    rooms.length,
    free:     rooms.filter(r => r.status === 'free').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  }

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter)

  const openRoom = (room) => {
    setSelected(room)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Карта номеров</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Всего {stats.total} • Свободно {stats.free} • Занято {stats.occupied} • Уборка {stats.cleaning}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setSelected(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Добавить номер
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Всего', value: stats.total, color: 'bg-slate-100 text-slate-700' },
          { label: 'Свободно', value: stats.free, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Занято', value: stats.occupied, color: 'bg-red-50 text-red-700' },
          { label: 'Уборка', value: stats.cleaning, color: 'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Фильтр */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Карта по этажам */}
      {floors.length === 0 ? (
        <EmptyState onAdd={() => { setSelected(null); setShowModal(true) }} />
      ) : (
        floors.map(floor => {
          const floorRooms = filtered.filter(r => r.floor_id === floor.id)
          if (floorRooms.length === 0 && filter !== 'all') return null
          return (
            <div key={floor.id} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-slate-800 text-white text-sm font-bold px-3 py-1 rounded-lg">
                  {floor.number} этаж
                </div>
                {floor.name && (
                  <span className="text-sm text-slate-500">{floor.name}</span>
                )}
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">
                  {floorRooms.filter(r => r.status === 'free').length} свободно
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {floorRooms.map(room => (
                  <RoomCard key={room.id} room={room} onClick={() => openRoom(room)} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Номера без этажа */}
      {(() => {
        const floorIds = floors.map(f => f.id)
        const orphans = filtered.filter(r => !floorIds.includes(r.floor_id))
        if (orphans.length === 0) return null
        return (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-slate-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                Без этажа
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {orphans.map(room => (
                <RoomCard key={room.id} room={room} onClick={() => openRoom(room)} />
              ))}
            </div>
          </div>
        )
      })()}

      {showModal && (
        <RoomModal
          room={selected}
          floors={floors}
          hotelId={hotel?.id}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
      <div className="text-4xl mb-3">🏨</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">Нет номеров</h3>
      <p className="text-sm text-slate-500 mb-4">
        Добавьте этажи и номера через Настройки или кнопку ниже
      </p>
      <button onClick={onAdd}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Добавить первый номер
      </button>
    </div>
  )
}
