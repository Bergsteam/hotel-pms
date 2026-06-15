import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = {
  income:  ['Оплата номера', 'Ресторан', 'Доп. услуги', 'Туристический сбор', 'Другое'],
  expense: ['Зарплата', 'Коммунальные', 'Расходники', 'Ремонт', 'Налоги', 'Реклама', 'Другое'],
}

export default function TransactionModal({ type, hotelId, onClose, onSaved }) {
  const [form, setForm] = useState({
    type,
    category:    CATEGORIES[type][0],
    amount:      '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.amount || +form.amount <= 0) { setError('Введите сумму'); return }
    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      hotel_id:    hotelId,
      type:        form.type,
      category:    form.category,
      amount:      +form.amount,
      description: form.description || null,
    })
    if (error) { setError(error.message); setLoading(false); return }
    onSaved()
    onClose()
  }

  const isIncome = form.type === 'income'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className={`flex items-center justify-between p-5 rounded-t-2xl ${
          isIncome ? 'bg-emerald-600' : 'bg-red-500'
        }`}>
          <h2 className="font-semibold text-white text-lg">
            {isIncome ? '↑ Приход' : '↓ Расход'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Переключатель тип */}
          <div className="grid grid-cols-2 gap-2">
            {['income','expense'].map(t => (
              <button key={t} type="button"
                onClick={() => { set('type', t); set('category', CATEGORIES[t][0]) }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'border border-slate-200 text-slate-600'
                }`}
              >
                {t === 'income' ? '↑ Приход' : '↓ Расход'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Сумма (сом) *</label>
            <input
              type="number" min="1" step="1" required
              value={form.amount} onChange={e => set('amount', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Категория</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES[form.type].map(cat => (
                <button key={cat} type="button"
                  onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.category === cat
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Описание</label>
            <input
              value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Номер 101, гость Иванов..."
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {loading ? 'Сохраняем...' : 'Записать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
