import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Receipt, Calculator } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import CashTab from './CashTab'
import DebtsTab from './DebtsTab'
import TaxTab from './TaxTab'

export default function FinancePage() {
  const { hotel } = useAuthStore()
  const [tab, setTab]       = useState('cash')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hotel) return
    const load = async () => {
      const now   = new Date()
      const month = format(now, 'yyyy-MM')

      const [{ data: txMonth }, { data: debts }] = await Promise.all([
        supabase.from('transactions')
          .select('type, amount')
          .eq('hotel_id', hotel.id)
          .gte('created_at', startOfMonth(now).toISOString())
          .lte('created_at', endOfMonth(now).toISOString()),
        supabase.from('reservations')
          .select('total_amount, paid_amount')
          .eq('hotel_id', hotel.id)
          .in('status', ['confirmed','checked_in']),
      ])

      const income  = (txMonth ?? []).filter(t => t.type === 'income').reduce((s, t) => s + +t.amount, 0)
      const expense = (txMonth ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0)
      const debt    = (debts ?? []).reduce((s, r) => s + Math.max(0, (+r.total_amount || 0) - (+r.paid_amount || 0)), 0)

      setSummary({ income, expense, profit: income - expense, debt })
      setLoading(false)
    }
    load()
  }, [hotel?.id, tab])

  const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

  const tabs = [
    { key: 'cash',  label: 'Касса',   icon: Wallet },
    { key: 'debts', label: 'Долги',   icon: AlertCircle },
    { key: 'tax',   label: 'Налоги',  icon: Calculator },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Финансы</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), 'LLLL yyyy', { locale: ru })}
        </p>
      </div>

      {/* KPI за месяц */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Доход</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800">{fmt(summary.income)}</div>
          <div className="text-xs text-emerald-600">сом за месяц</div>
        </div>

        <div className="bg-red-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <span className="text-xs font-medium text-red-600">Расход</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{fmt(summary.expense)}</div>
          <div className="text-xs text-red-500">сом за месяц</div>
        </div>

        <div className={`rounded-xl p-4 ${summary.profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} className={summary.profit >= 0 ? 'text-blue-600' : 'text-orange-500'} />
            <span className={`text-xs font-medium ${summary.profit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
              Прибыль
            </span>
          </div>
          <div className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-800' : 'text-orange-700'}`}>
            {summary.profit >= 0 ? '' : '−'}{fmt(Math.abs(summary.profit))}
          </div>
          <div className={`text-xs ${summary.profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>сом за месяц</div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Долги гостей</span>
          </div>
          <div className="text-2xl font-bold text-amber-800">{fmt(summary.debt)}</div>
          <div className="text-xs text-amber-600">сом не оплачено</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'cash'  && <CashTab hotel={hotel} />}
      {tab === 'debts' && <DebtsTab hotel={hotel} />}
      {tab === 'tax'   && <TaxTab hotel={hotel} summary={summary} />}
    </div>
  )
}
