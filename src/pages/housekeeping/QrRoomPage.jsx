import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader, BedDouble, Sparkles, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ACTIONS = [
  { status: 'cleaning', label: 'Начать уборку',   icon: Sparkles,     color: 'bg-yellow-500 hover:bg-yellow-600' },
  { status: 'free',     label: 'Уборка завершена', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { status: 'blocked',  label: 'Заблокировать',    icon: Lock,         color: 'bg-slate-600 hover:bg-slate-700' },
]

const STATUS_LABEL = {
  free:     '🟢 Свободен',
  occupied: '🔴 Занят',
  cleaning: '🟡 Уборка',
  checkout: '🟠 Выезд',
  blocked:  '⚫ Заблокирован',
}

export default function QrRoomPage() {
  const { roomId } = useParams()
  const [room, setRoom]       = useState(null)
  const [hotel, setHotel]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [done, setDone]       = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, hotels(name, city)')
        .eq('id', roomId)
        .single()

      if (error || !data) {
        setError('Номер не найден')
      } else {
        setRoom(data)
        setHotel(data.hotels)
      }
      setLoading(false)
    }
    load()
  }, [roomId])

  const handleAction = async (status) => {
    setUpdating(status)
    setDone(null)
    const { error } = await supabase.rpc('update_room_status_by_qr', {
      room_uuid:  roomId,
      new_status: status,
    })
    if (error) {
      setError('Ошибка обновления статуса')
    } else {
      setRoom(prev => ({ ...prev, status }))
      setDone(status)
    }
    setUpdating(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader size={32} className="text-white animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-slate-300">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      {/* Шапка */}
      <div className="text-center mb-8">
        <div className="text-slate-400 text-sm mb-1">{hotel?.name}</div>
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center">
            <BedDouble size={28} className="text-slate-300" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mt-3">Номер {room.number}</h1>
        <div className="mt-2 text-slate-300 text-lg">{STATUS_LABEL[room.status]}</div>
      </div>

      {/* Успех */}
      {done && (
        <div className="bg-emerald-900/50 border border-emerald-500 rounded-2xl p-4 mb-6 text-center w-full max-w-sm">
          <div className="text-emerald-400 font-semibold">
            ✓ Статус обновлён: {STATUS_LABEL[done]}
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="w-full max-w-sm space-y-3">
        {ACTIONS.map(({ status, label, icon: Icon, color }) => (
          <button
            key={status}
            onClick={() => handleAction(status)}
            disabled={!!updating || room.status === status}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-semibold text-lg transition-colors disabled:opacity-40 ${color}`}
          >
            {updating === status
              ? <Loader size={22} className="animate-spin" />
              : <Icon size={22} />
            }
            {label}
          </button>
        ))}
      </div>

      <p className="text-slate-600 text-xs mt-8 text-center">
        QR · Hotel PMS · {hotel?.city}
      </p>
    </div>
  )
}
