import { useState, useEffect } from 'react'
import { X, Trash2, Star, Phone, Mail, CreditCard, Globe, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const NATIONALITIES = [
  { code: 'KG', label: 'Кыргызстан' },
  { code: 'KZ', label: 'Казахстан' },
  { code: 'RU', label: 'Россия' },
  { code: 'UZ', label: 'Узбекистан' },
  { code: 'TJ', label: 'Таджикистан' },
  { code: 'CN', label: 'Китай' },
  { code: 'DE', label: 'Германия' },
  { code: 'OTHER', label: 'Другое' },
]

const STATUS_LABEL = {
  confirmed: 'Подтверждено', checked_in: 'Заселён',
  checked_out: 'Выехал', cancelled: 'Отменено', no_show: 'Не явился',
}
const STATUS_COLOR = {
  confirmed: 'text-blue-600', checked_in: 'text-emerald-600',
  checked_out: 'text-slate-500', cancelled: 'text-red-500', no_show: 'text-orange-500',
}

export default function GuestModal({ guest, hotelId, onClose, onSaved }) {
  const isEdit = !!guest
  const [tab, setTab] = useState('info')
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({
    full_name:   guest?.full_name   ?? '',
    phone:       guest?.phone       ?? '',
    email:       guest?.email       ?? '',
    passport:    guest?.passport    ?? '',
    nationality: guest?.nationality ?? 'KG',
    notes:       guest?.notes       ?? '',
    loyalty_pts: guest?.loyalty_pts ?? 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isEdit && tab === 'history') {
      supabase.from('reservations')
        .select('*, rooms(number, type)')
        .eq('hotel_id', hotelId)
        .or(`guest_id.eq.${guest.id},guest_phone.eq.${guest.phone ?? 'x'}`)
        .order('check_in', { ascending: false })
        .then(({ data }) => setHistory(data ?? []))
    }
  }, [tab, guest?.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('guests').update(form).eq('id', guest.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('guests').insert({ ...form, hotel_id: hotelId })
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
    if (!confirm(`Удалить гостя ${guest.full_name}?`)) return
    await supabase.from('guests').delete().eq('id', guest.id)
    onSaved()
    onClose()
  }

  const totalSpent = history
    .filter(r => r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.total_amount ?? 0), 0)

  const fmt = (d) => format(new Date(d), 'd MMM yyyy', { locale: ru })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">

        {/* Шапка */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {(form.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                {isEdit ? form.full_name : 'Новый гость'}
              </h2>
              {isEdit && guest.loyalty_pts > 0 && (
                <div className="flex items-center gap-1 text-amber-500 text-xs">
                  <Star size={11} fill="currentColor" /> {guest.loyalty_pts} баллов лояльности
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Вкладки (только для существующего гостя) */}
        {isEdit && (
          <div className="flex gap-1 px-5 pt-4">
            {[
              { key: 'info',    label: 'Информация' },
              { key: 'history', label: `История (${history.length || '...'})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Вкладка: Информация */}
        {tab === 'info' && (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1"><FileText size={12} /> Полное имя *</span>
              </label>
              <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иванов Иван Иванович" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><Phone size={12} /> Телефон</span>
                </label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+996 700 000 000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><Mail size={12} /> Email</span>
                </label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="guest@mail.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><CreditCard size={12} /> Паспорт / ID</span>
                </label>
                <input value={form.passport} onChange={e => set('passport', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID 1234567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><Globe size={12} /> Гражданство</span>
                </label>
                <select value={form.nationality} onChange={e => set('nationality', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
                </select>
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><Star size={12} /> Баллы лояльности</span>
                </label>
                <input type="number" min={0} value={form.loyalty_pts}
                  onChange={e => set('loyalty_pts', +e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Заметки</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Предпочтения, аллергии, особые пожелания..." />
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
        )}

        {/* Вкладка: История */}
        {tab === 'history' && (
          <div className="p-5">
            {totalSpent > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-center justify-between">
                <div className="text-sm text-blue-700">Всего потрачено</div>
                <div className="font-bold text-blue-800 text-lg">
                  {new Intl.NumberFormat('ru-KG').format(totalSpent)} сом
                </div>
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">История визитов пуста</div>
            ) : (
              <div className="space-y-3">
                {history.map(r => (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-800">
                        № {r.rooms?.number}
                      </div>
                      <span className={`text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {fmt(r.check_in)} — {fmt(r.check_out)}
                      {' · '}
                      {Math.round((new Date(r.check_out) - new Date(r.check_in)) / 86400000)} ночей
                    </div>
                    {r.total_amount > 0 && (
                      <div className="text-sm font-medium text-slate-700 mt-1">
                        {new Intl.NumberFormat('ru-KG').format(r.total_amount)} сом
                      </div>
                    )}
                    {r.notes && (
                      <div className="text-xs text-slate-400 mt-1 italic">{r.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
