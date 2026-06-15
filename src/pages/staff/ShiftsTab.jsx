import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00',
               '15:00','16:00','17:00','18:00','19:00','20:00','22:00']

export default function ShiftsTab({ staff, hotel }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [shifts, setShifts]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [formDate, setFormDate]   = useState(null)

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*, profiles(full_name, role)')
      .eq('hotel_id', hotel.id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(addDays(weekStart, 6), 'yyyy-MM-dd'))
      .order('start_time')
    setShifts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id, weekStart])

  const shiftsForDay = (day) =>
    shifts.filter(s => s.date === format(day, 'yyyy-MM-dd'))

  const ROLE_COLOR = {
    manager: 'bg-purple-100 border-purple-300 text-purple-800',
    reception: 'bg-blue-100 border-blue-300 text-blue-800',
    housekeeper: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    chef: 'bg-orange-100 border-orange-300 text-orange-800',
    owner: 'bg-slate-100 border-slate-300 text-slate-700',
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      {/* Навигация по неделям */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-slate-700">
          {format(weekStart, 'd MMM', { locale: ru })} —{' '}
          {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
        </span>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
        >
          Сегодня
        </button>
        <button onClick={() => { setFormDate(format(new Date(), 'yyyy-MM-dd')); setShowForm(true) }}
          className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Добавить смену
        </button>
      </div>

      {/* Сетка недели */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayShifts  = shiftsForDay(day)
          const isToday    = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          return (
            <div key={day.toISOString()}>
              <div className={`text-center mb-2 py-1.5 rounded-lg ${
                isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <div className="text-xs font-medium">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div className="text-sm font-bold">{format(day, 'd')}</div>
              </div>
              <div className="space-y-1 min-h-24">
                {dayShifts.map(s => (
                  <ShiftCard key={s.id} shift={s} colorClass={ROLE_COLOR[s.profiles?.role] ?? 'bg-slate-100'} onDelete={load} />
                ))}
                <button
                  onClick={() => { setFormDate(format(day, 'yyyy-MM-dd')); setShowForm(true) }}
                  className="w-full py-1 text-slate-300 hover:text-slate-500 text-xs hover:bg-slate-50 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <ShiftForm
          date={formDate}
          staff={staff}
          hotelId={hotel.id}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function ShiftCard({ shift, colorClass, onDelete }) {
  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('Удалить смену?')) return
    await supabase.from('shifts').delete().eq('id', shift.id)
    onDelete()
  }

  return (
    <div className={`relative p-1.5 rounded-lg border text-xs ${colorClass} group`}>
      <div className="font-medium truncate pr-4">{shift.profiles?.full_name?.split(' ')[0]}</div>
      <div className="opacity-70">{shift.start_time}–{shift.end_time}</div>
      <button onClick={handleDelete}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function ShiftForm({ date, staff, hotelId, onClose, onSaved }) {
  const [form, setForm] = useState({
    profile_id: staff[0]?.id ?? '',
    date:       date ?? format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time:   '18:00',
    notes:      '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('shifts').insert({ ...form, hotel_id: hotelId })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">Добавить смену</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Сотрудник</label>
            <select value={form.profile_id} onChange={e => set('profile_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Дата</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Начало</label>
              <select value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Конец</label>
              <select value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Заметка</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Сохраняем...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
