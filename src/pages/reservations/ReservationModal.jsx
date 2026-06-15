import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUSES = [
  { value: 'confirmed',   label: 'Подтверждено' },
  { value: 'checked_in',  label: 'Заселён' },
  { value: 'checked_out', label: 'Выехал' },
  { value: 'cancelled',   label: 'Отменено' },
  { value: 'no_show',     label: 'Не явился' },
]

const SOURCES = [
  { value: 'direct',   label: 'Прямое' },
  { value: 'booking',  label: 'Booking.com' },
  { value: 'airbnb',   label: 'Airbnb' },
  { value: 'other',    label: 'Другое' },
]

const TYPE_LABEL = { standard:'Стандарт', deluxe:'Делюкс', suite:'Люкс', family:'Семейный', economy:'Эконом' }

export default function ReservationModal({ reservation, rooms, hotelId, onClose, onSaved }) {
  const isEdit = !!reservation

  const [form, setForm] = useState({
    room_id:      reservation?.room_id ?? rooms[0]?.id ?? '',
    guest_name:   reservation?.guest_name ?? '',
    guest_phone:  reservation?.guest_phone ?? '',
    check_in:     reservation?.check_in ?? '',
    check_out:    reservation?.check_out ?? '',
    adults:       reservation?.adults ?? 1,
    children:     reservation?.children ?? 0,
    status:       reservation?.status ?? 'confirmed',
    source:       reservation?.source ?? 'direct',
    total_amount: reservation?.total_amount ?? '',
    paid_amount:  reservation?.paid_amount ?? 0,
    notes:        reservation?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Авторасчёт суммы при изменении дат или номера
  useEffect(() => {
    if (form.check_in && form.check_out && form.room_id) {
      const room = rooms.find(r => r.id === form.room_id)
      if (!room) return
      const nights = Math.max(0, (new Date(form.check_out) - new Date(form.check_in)) / 86400000)
      set('total_amount', Math.round(nights * room.price_per_night))
    }
  }, [form.check_in, form.check_out, form.room_id])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, hotel_id: hotelId }
      if (isEdit) {
        const { error } = await supabase.from('reservations').update(payload).eq('id', reservation.id)
        if (error) throw error

        // Обновить статус номера при заселении/выезде
        if (form.status === 'checked_in') {
          await supabase.from('rooms').update({ status: 'occupied' }).eq('id', form.room_id)
        } else if (form.status === 'checked_out') {
          await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', form.room_id)
        }
      } else {
        // Найти или создать гостя по телефону
        let guestId = null
        if (form.guest_phone) {
          const { data: existing } = await supabase
            .from('guests')
            .select('id, loyalty_pts')
            .eq('hotel_id', hotelId)
            .eq('phone', form.guest_phone)
            .single()

          if (existing) {
            guestId = existing.id
            // +1 балл лояльности за визит
            await supabase.from('guests')
              .update({ loyalty_pts: (existing.loyalty_pts ?? 0) + 1 })
              .eq('id', existing.id)
          } else {
            const { data: newGuest } = await supabase
              .from('guests')
              .insert({ hotel_id: hotelId, full_name: form.guest_name, phone: form.guest_phone, loyalty_pts: 1 })
              .select('id').single()
            guestId = newGuest?.id ?? null
          }
        }

        const { error } = await supabase.from('reservations').insert({ ...payload, guest_id: guestId })
        if (error) throw error
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Удалить это бронирование?')) return
    setLoading(true)
    await supabase.from('reservations').delete().eq('id', reservation.id)
    onSaved()
    onClose()
  }

  const nights = form.check_in && form.check_out
    ? Math.max(0, Math.round((new Date(form.check_out) - new Date(form.check_in)) / 86400000))
    : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? 'Бронирование' : 'Новое бронирование'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Гость */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Имя гостя *</label>
              <input required value={form.guest_name} onChange={e => set('guest_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иванов Иван" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Телефон</label>
              <input value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+996 700 000 000" />
            </div>
          </div>

          {/* Номер */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Номер комнаты *</label>
            <select required value={form.room_id} onChange={e => set('room_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  № {r.number} — {TYPE_LABEL[r.type] ?? r.type} ({r.price_per_night} сом/ночь)
                </option>
              ))}
            </select>
          </div>

          {/* Даты */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Заезд *</label>
              <input required type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Выезд *</label>
              <input required type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)}
                min={form.check_in}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg">
              {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
              {form.total_amount ? ` · ${new Intl.NumberFormat('ru-KG').format(form.total_amount)} сом` : ''}
            </div>
          )}

          {/* Гости */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Взрослых</label>
              <input type="number" min={1} max={10} value={form.adults} onChange={e => set('adults', +e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Детей</label>
              <input type="number" min={0} max={10} value={form.children} onChange={e => set('children', +e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Оплата */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Сумма (сом)</label>
              <input type="number" min={0} value={form.total_amount} onChange={e => set('total_amount', +e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Оплачено (сом)</label>
              <input type="number" min={0} value={form.paid_amount} onChange={e => set('paid_amount', +e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Источник и статус */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Источник</label>
              <select value={form.source} onChange={e => set('source', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Статус</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Заметки</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Пожелания гостя, специальные требования..." />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-2 pt-1">
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={loading}
                className="p-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50"
            >
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
