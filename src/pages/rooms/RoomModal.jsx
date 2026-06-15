import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUSES = [
  { value: 'free',     label: 'Свободен' },
  { value: 'occupied', label: 'Занят' },
  { value: 'cleaning', label: 'Уборка' },
  { value: 'checkout', label: 'Выезд' },
  { value: 'blocked',  label: 'Заблокирован' },
]

const TYPES = [
  { value: 'standard', label: 'Стандарт' },
  { value: 'deluxe',   label: 'Делюкс' },
  { value: 'suite',    label: 'Люкс' },
  { value: 'family',   label: 'Семейный' },
  { value: 'economy',  label: 'Эконом' },
]

export default function RoomModal({ room, floors, hotelId, onClose, onSaved }) {
  const isEdit = !!room

  const [form, setForm] = useState({
    number:          room?.number ?? '',
    floor_id:        room?.floor_id ?? floors[0]?.id ?? '',
    type:            room?.type ?? 'standard',
    capacity:        room?.capacity ?? 2,
    price_per_night: room?.price_per_night ?? 0,
    status:          room?.status ?? 'free',
    description:     room?.description ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('rooms').update(form).eq('id', room.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('rooms').insert({ ...form, hotel_id: hotelId })
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
    if (!confirm(`Удалить номер ${room.number}?`)) return
    setLoading(true)
    await supabase.from('rooms').delete().eq('id', room.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? `Номер ${room.number}` : 'Новый номер'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Номер *</label>
              <input required value={form.number} onChange={e => set('number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="101" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Этаж *</label>
              <select value={form.floor_id} onChange={e => set('floor_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {floors.map(f => (
                  <option key={f.id} value={f.id}>{f.number} этаж {f.name ? `(${f.name})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Тип</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Мест</label>
              <input type="number" min={1} max={10} value={form.capacity}
                onChange={e => set('capacity', +e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Цена за ночь (сом)</label>
            <input type="number" min={0} value={form.price_per_night}
              onChange={e => set('price_per_night', +e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="2500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Статус</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(s => (
                <label key={s.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                    form.status === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="status" value={s.value} checked={form.status === s.value}
                    onChange={() => set('status', s.value)} className="hidden" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Описание</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Вид на горы, балкон..." />
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
