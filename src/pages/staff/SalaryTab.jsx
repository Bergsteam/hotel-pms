import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

export default function SalaryTab({ staff, hotel }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formStaff, setFormStaff] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('salary_payments')
      .select('*, profiles(full_name)')
      .eq('hotel_id', hotel.id)
      .eq('month', month)
      .eq('year',  year)
    setPayments(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id, month, year])

  const paidFor = (profileId) =>
    payments.filter(p => p.profile_id === profileId).reduce((s, p) => s + +p.amount, 0)

  const totalPaid = payments.reduce((s, p) => s + +p.amount, 0)
  const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    ({ value: i + 1, label: format(new Date(2024, i, 1), 'LLLL', { locale: ru }) })
  )

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      {/* Фильтр периода */}
      <div className="flex items-center gap-3 mb-5">
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
        </select>

        {totalPaid > 0 && (
          <div className="ml-auto text-sm font-semibold text-slate-700">
            Выплачено: <span className="text-emerald-600">{fmt(totalPaid)} сом</span>
          </div>
        )}
      </div>

      {/* Таблица по сотрудникам */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Сотрудник</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Роль</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Выплачено</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Действие</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => {
              const paid = paidFor(s.id)
              return (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {s.full_name[0]}
                      </div>
                      <span className="font-medium text-slate-800">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs capitalize">{s.role}</td>
                  <td className="px-4 py-3 text-right">
                    {paid > 0
                      ? <span className="font-semibold text-emerald-600">{fmt(paid)} сом</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setFormStaff(s); setShowForm(true) }}
                      className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Plus size={12} /> Выплата
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* История выплат */}
      {payments.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">История выплат за период</h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{p.profiles?.full_name}</div>
                    {p.notes && <div className="text-xs text-slate-400">{p.notes}</div>}
                  </div>
                </div>
                <div className="font-bold text-emerald-700">{fmt(p.amount)} сом</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <SalaryModal
          staff={formStaff}
          hotel={hotel}
          month={month}
          year={year}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function SalaryModal({ staff, hotel, month, year, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [notes,  setNotes]  = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!amount || +amount <= 0) return
    setLoading(true)
    await supabase.from('salary_payments').insert({
      hotel_id:   hotel.id,
      profile_id: staff.id,
      amount:     +amount,
      month, year,
      notes: notes || null,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-slate-800">Выплата зарплаты</h2>
            <p className="text-xs text-slate-500">{staff.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Сумма (сом) *</label>
            <input type="number" min="1" required value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Заметка</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Аванс, полная выплата..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Записываем...' : 'Выплатить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
