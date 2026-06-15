import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Building2, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'

const CITIES = ['Каракол', 'Чолпон-Ата', 'Балыкчи', 'Бишкек', 'Ош', 'Другой']
const TAX_MODES = [
  { value: 'ors',    label: 'ОРС (единый налог)' },
  { value: 'nds',    label: 'НДС' },
  { value: 'patent', label: 'Патент' },
]

export default function SettingsPage() {
  const { hotel, loadProfile, user } = useAuthStore()
  const [tab, setTab] = useState('hotel')

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Настройки</h1>

      {/* Вкладки */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {[
          { key: 'hotel',  label: 'Об отеле',  icon: Building2 },
          { key: 'floors', label: 'Этажи',      icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'hotel'  && <HotelTab hotel={hotel} onSaved={() => loadProfile(user)} />}
      {tab === 'floors' && <FloorsTab hotel={hotel} />}
    </div>
  )
}

/* ─── Вкладка: Об отеле ─── */
function HotelTab({ hotel, onSaved }) {
  const [form, setForm] = useState({
    name:         hotel?.name ?? '',
    city:         hotel?.city ?? 'Каракол',
    phone:        hotel?.phone ?? '',
    tax_mode:     hotel?.tax_mode ?? 'ors',
    season_start: hotel?.season_start ?? '',
    season_end:   hotel?.season_end ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('hotels').update(form).eq('id', hotel.id)
    setSaving(false)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
      <h2 className="font-semibold text-slate-800 mb-5">Информация об отеле</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Название *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Гостевой дом «Иссык-Куль»" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Город</label>
            <select value={form.city} onChange={e => set('city', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Телефон</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+996 700 000 000" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Налоговый режим</label>
          <select value={form.tax_mode} onChange={e => set('tax_mode', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TAX_MODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Сезонный режим <span className="text-slate-400 font-normal">(оставьте пустым если работаете круглый год)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Открытие (месяц)</label>
              <select value={form.season_start} onChange={e => set('season_start', e.target.value || null)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Круглый год</option>
                {['Январь','Февраль','Март','Апрель','Май','Июнь',
                  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Закрытие (месяц)</label>
              <select value={form.season_end} onChange={e => set('season_end', e.target.value || null)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Круглый год</option>
                {['Январь','Февраль','Март','Апрель','Май','Июнь',
                  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Save size={15} />
          {saving ? 'Сохраняем...' : saved ? 'Сохранено ✓' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}

/* ─── Вкладка: Этажи ─── */
function FloorsTab({ hotel }) {
  const [floors, setFloors]   = useState([])
  const [loading, setLoading] = useState(true)
  const [newNum, setNewNum]   = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding]   = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('floors').select('*').eq('hotel_id', hotel.id).order('number')
    setFloors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (hotel) load() }, [hotel?.id])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newNum) return
    setAdding(true)
    await supabase.from('floors').insert({
      hotel_id: hotel.id,
      number:   parseInt(newNum),
      name:     newName || null,
    })
    setNewNum('')
    setNewName('')
    setAdding(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этаж? Все номера этажа тоже будут удалены.')) return
    await supabase.from('floors').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="max-w-lg space-y-4">
      {/* Список этажей */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-sm font-medium text-slate-700">Этажи ({floors.length})</span>
        </div>
        {floors.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Этажей пока нет</div>
        ) : (
          floors.map(floor => (
            <div key={floor.id}
              className="flex items-center justify-between px-5 py-3 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 text-white text-sm font-bold rounded-lg flex items-center justify-center">
                  {floor.number}
                </div>
                <span className="text-sm text-slate-700">
                  {floor.number} этаж {floor.name ? `· ${floor.name}` : ''}
                </span>
              </div>
              <button onClick={() => handleDelete(floor.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Форма добавления */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Добавить этаж</h3>
        <div className="flex gap-2">
          <input
            type="number" min={1} max={99} required
            value={newNum} onChange={e => setNewNum(e.target.value)}
            placeholder="Номер этажа"
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Название (необязательно)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={adding}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Добавить
          </button>
        </div>
      </form>
    </div>
  )
}
