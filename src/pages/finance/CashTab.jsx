import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Printer } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import TransactionModal from './TransactionModal'

const INCOME_CATS  = ['Оплата номера','Ресторан','Доп. услуги','Другое']
const EXPENSE_CATS = ['Зарплата','Коммунальные','Расходники','Ремонт','Налоги','Другое']

export default function CashTab({ hotel }) {
  const [transactions, setTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showModal, setShowModal] = useState(false)
  const [txType, setTxType]   = useState('income')

  const load = async () => {
    setLoading(true)
    const day = new Date(date)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('hotel_id', hotel.id)
      .gte('created_at', startOfDay(day).toISOString())
      .lte('created_at', endOfDay(day).toISOString())
      .order('created_at', { ascending: false })
    setTx(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [date, hotel?.id])

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + +t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0)
  const balance = income - expense

  const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

  const printZReport = () => {
    const lines = [
      `Z-ОТЧЁТ — ${format(new Date(date), 'd MMMM yyyy', { locale: ru })}`,
      `Отель: ${hotel.name}`,
      '─'.repeat(40),
      `Доход:   ${fmt(income)} сом`,
      `Расход:  ${fmt(expense)} сом`,
      `Итого:   ${fmt(balance)} сом`,
      '─'.repeat(40),
      'ОПЕРАЦИИ:',
      ...transactions.map(t =>
        `${t.type === 'income' ? '+' : '-'} ${fmt(t.amount)} сом | ${t.category} | ${t.description ?? ''}`
      ),
    ].join('\n')
    const w = window.open('', '_blank')
    w.document.write(`<pre style="font-family:monospace;font-size:14px;padding:20px">${lines}</pre>`)
    w.print()
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      {/* Панель управления */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 ml-auto">
          <button onClick={printZReport}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            <Printer size={15} /> Z-отчёт
          </button>
          <button onClick={() => { setTxType('expense'); setShowModal(true) }}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <TrendingDown size={15} /> Расход
          </button>
          <button onClick={() => { setTxType('income'); setShowModal(true) }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <TrendingUp size={15} /> Доход
          </button>
        </div>
      </div>

      {/* Итоги дня */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <div className="text-lg font-bold text-emerald-700">{fmt(income)}</div>
          <div className="text-xs text-emerald-600">Доход (сом)</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-lg font-bold text-red-600">{fmt(expense)}</div>
          <div className="text-xs text-red-500">Расход (сом)</div>
        </div>
        <div className={`rounded-xl p-4 text-center ${balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            {balance >= 0 ? '' : '−'}{fmt(Math.abs(balance))}
          </div>
          <div className={`text-xs ${balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>Баланс (сом)</div>
        </div>
      </div>

      {/* Список операций */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-sm">Операций за этот день нет</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Время</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Категория</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Описание</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(t.created_at), 'HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {t.type === 'income' ? '↑' : '↓'} {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.description ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    t.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <TransactionModal
          type={txType}
          hotelId={hotel.id}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
