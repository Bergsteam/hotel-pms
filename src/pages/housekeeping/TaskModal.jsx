import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PRIORITIES = [
  { value: 'low',    label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high',   label: 'Высокий' },
  { value: 'urgent', label: 'Срочно' },
]

export default function TaskModal({ task, rooms, staff, hotelId, onClose, onSaved }) {
  const isEdit = !!task
  const [form, setForm] = useState({
    room_id:     task?.room_id     ?? rooms[0]?.id ?? '',
    assigned_to: task?.assigned_to ?? '',
    priority:    task?.priority    ?? 'normal',
    notes:       task?.notes       ?? '',
    status:      task?.status      ?? 'pending',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        hotel_id:    hotelId,
        assigned_to: form.assigned_to || null,
      }
      if (isEdit) {
        const { error } = await supabase.from('housekeeping_tasks').update(payload).eq('id', task.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('housekeeping_tasks').insert(payload)
        if (error) throw error
        // Переводим номер в статус "уборка"
        await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', form.room_id)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Удалить задачу?')) return
    await supabase.from('housekeeping_tasks').delete().eq('id', task.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Номер комнаты *</label>
            <select required value={form.room_id} onChange={e => set('room_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>№ {r.number} — {r.status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Назначить горничной</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Не назначено</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Приоритет</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <label key={p.value}
                  className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                    form.priority === p.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="priority" value={p.value}
                    checked={form.priority === p.value}
                    onChange={() => set('priority', p.value)} className="hidden" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Заметки</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Особые инструкции по уборке..." />
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
