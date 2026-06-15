import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

export default function DebtsTab({ hotel }) {
  const [debts, setDebts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hotel) return
    const load = async () => {
      const { data } = await supabase
        .from('reservations')
        .select('*, rooms(number)')
        .eq('hotel_id', hotel.id)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .order('check_in', { ascending: false })
      // Фильтруем только те где есть долг
      const withDebt = (data ?? []).filter(r =>
        (+r.total_amount || 0) - (+r.paid_amount || 0) > 0
      )
      setDebts(withDebt)
      setLoading(false)
    }
    load()
  }, [hotel?.id])

  const fmt    = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))
  const fmtDate = (d) => format(new Date(d), 'd MMM', { locale: ru })

  const totalDebt = debts.reduce((s, r) =>
    s + Math.max(0, (+r.total_amount || 0) - (+r.paid_amount || 0)), 0
  )

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      {debts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-800">Общий долг гостей</div>
            <div className="text-xs text-amber-600">{debts.length} бронирований</div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{fmt(totalDebt)} сом</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {debts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm">Долгов нет — все оплачено</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Гость</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Номер</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Даты</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Итого</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Оплачено</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Долг</th>
              </tr>
            </thead>
            <tbody>
              {debts.map(r => {
                const debt = Math.max(0, (+r.total_amount || 0) - (+r.paid_amount || 0))
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.guest_name}</div>
                      {r.guest_phone && <div className="text-xs text-slate-400">{r.guest_phone}</div>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">№ {r.rooms?.number}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {fmtDate(r.check_in)} — {fmtDate(r.check_out)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(r.total_amount || 0)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmt(r.paid_amount || 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(debt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
