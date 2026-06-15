import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import TaskModal from './TaskModal'

const STATUS_CONFIG = {
  pending:     { label: 'Ожидает',    icon: Clock,         color: 'text-slate-500',  bg: 'bg-slate-100' },
  in_progress: { label: 'В работе',   icon: AlertCircle,   color: 'text-blue-600',   bg: 'bg-blue-50' },
  done:        { label: 'Готово',     icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

const PRIORITY_COLOR = {
  low:    'bg-slate-100 text-slate-500',
  normal: 'bg-blue-100 text-blue-600',
  high:   'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}
const PRIORITY_LABEL = { low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочно' }

export default function HousekeepingPage() {
  const { hotel } = useAuthStore()
  const [tasks, setTasks]     = useState([])
  const [rooms, setRooms]     = useState([])
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected]   = useState(null)

  const load = async () => {
    if (!hotel) return
    setLoading(true)
    const [{ data: t }, { data: r }, { data: s }] = await Promise.all([
      supabase.from('housekeeping_tasks')
        .select('*, rooms(number, floor_id), profiles(full_name)')
        .eq('hotel_id', hotel.id)
        .order('created_at', { ascending: false }),
      supabase.from('rooms').select('id, number, status').eq('hotel_id', hotel.id).order('number'),
      supabase.from('profiles').select('id, full_name, role')
        .eq('hotel_id', hotel.id)
        .in('role', ['housekeeper', 'manager', 'owner']),
    ])
    setTasks(t ?? [])
    setRooms(r ?? [])
    setStaff(s ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'housekeeping_tasks',
        filter: `hotel_id=eq.${hotel?.id}`,
      }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [hotel?.id])

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const stats = {
    pending:     tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done:        tasks.filter(t => t.status === 'done').length,
  }

  const updateStatus = async (task, status) => {
    await supabase.from('housekeeping_tasks').update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', task.id)

    if (status === 'done') {
      await supabase.from('rooms').update({ status: 'free' }).eq('id', task.room_id)
    } else if (status === 'in_progress') {
      await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', task.room_id)
    }
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Горничные</h1>
          <p className="text-sm text-slate-500 mt-0.5">Задачи на уборку</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setSelected(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Новая задача
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { key: 'pending',     label: 'Ожидают',  color: 'bg-slate-50  text-slate-700' },
          { key: 'in_progress', label: 'В работе', color: 'bg-blue-50   text-blue-700' },
          { key: 'done',        label: 'Готово',   color: 'bg-emerald-50 text-emerald-700' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key === filter ? 'all' : s.key)}
            className={`${s.color} rounded-xl p-4 text-left transition-all ${filter === s.key ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div className="text-2xl font-bold">{stats[s.key]}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Задачи */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <div className="text-3xl mb-2">🧹</div>
          <div className="text-sm">Задач нет</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const cfg = STATUS_CONFIG[task.status]
            const Icon = cfg.icon
            return (
              <div key={task.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-colors"
              >
                {/* Иконка статуса */}
                <div className={`${cfg.bg} p-2 rounded-lg`}>
                  <Icon size={18} className={cfg.color} />
                </div>

                {/* Информация */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800">
                      № {task.rooms?.number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {task.profiles?.full_name
                      ? `Назначено: ${task.profiles.full_name}`
                      : 'Не назначено'}
                    {task.notes && ` · ${task.notes}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(task.created_at), 'd MMM, HH:mm', { locale: ru })}
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="flex gap-2 shrink-0">
                  {task.status === 'pending' && (
                    <button onClick={() => updateStatus(task, 'in_progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      В работу
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button onClick={() => updateStatus(task, 'done')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Готово ✓
                    </button>
                  )}
                  {task.status === 'done' && (
                    <span className="px-3 py-1.5 text-emerald-600 text-xs font-medium">
                      ✓ Убрано
                    </span>
                  )}
                  <button
                    onClick={() => { setSelected(task); setShowModal(true) }}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Изменить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <TaskModal
          task={selected}
          rooms={rooms}
          staff={staff}
          hotelId={hotel?.id}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
