import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachMonthOfInterval, subMonths, differenceInDays
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Download, TrendingUp, BedDouble, BarChart2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'

const PERIODS = [
  { key: 'month',    label: 'Этот месяц' },
  { key: 'last',     label: 'Прошлый месяц' },
  { key: 'quarter',  label: 'Квартал' },
  { key: 'year',     label: 'Этот год' },
]

const SOURCE_LABEL = { direct: 'Прямые', booking: 'Booking.com', airbnb: 'Airbnb', other: 'Другое' }
const SOURCE_COLOR = {
  direct:  'bg-blue-500',
  booking: 'bg-blue-800',
  airbnb:  'bg-pink-500',
  other:   'bg-slate-400',
}

function getPeriodDates(key) {
  const now = new Date()
  switch (key) {
    case 'month':   return { from: startOfMonth(now),          to: endOfMonth(now) }
    case 'last':    return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) }
    case 'quarter': return { from: startOfMonth(subMonths(now,2)), to: endOfMonth(now) }
    case 'year':    return { from: startOfYear(now),           to: endOfYear(now) }
    default:        return { from: startOfMonth(now),          to: endOfMonth(now) }
  }
}

export default function AnalyticsPage() {
  const { hotel } = useAuthStore()
  const [period, setPeriod]   = useState('month')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hotel) return
    const load = async () => {
      setLoading(true)
      const { from, to } = getPeriodDates(period)

      const [{ data: reservations }, { data: rooms }, { data: transactions }] = await Promise.all([
        supabase.from('reservations')
          .select('check_in, check_out, total_amount, paid_amount, status, source, room_id')
          .eq('hotel_id', hotel.id)
          .gte('check_in', format(from, 'yyyy-MM-dd'))
          .lte('check_in', format(to, 'yyyy-MM-dd')),
        supabase.from('rooms').select('id, type').eq('hotel_id', hotel.id),
        supabase.from('transactions')
          .select('type, amount, created_at')
          .eq('hotel_id', hotel.id)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),
      ])

      setData(calcMetrics(reservations ?? [], rooms ?? [], transactions ?? [], from, to))
      setLoading(false)
    }
    load()
  }, [hotel?.id, period])

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Аналитика</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(getPeriodDates(period).from, 'd MMM', { locale: ru })} —{' '}
            {format(getPeriodDates(period).to,   'd MMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => exportCSV(data, hotel)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<TrendingUp size={18} className="text-emerald-600" />}
          label="Выручка" value={`${fmtN(data.revenue)} сом`}
          sub={`${data.bookings} бронирований`} color="bg-emerald-50" />
        <KpiCard icon={<BedDouble size={18} className="text-blue-600" />}
          label="Загруженность" value={`${data.occupancy}%`}
          sub={`${data.occupiedNights} ночей из ${data.totalNights}`} color="bg-blue-50" />
        <KpiCard icon={<BarChart2 size={18} className="text-purple-600" />}
          label="RevPAR" value={`${fmtN(data.revpar)} сом`}
          sub="выручка / номер / ночь" color="bg-purple-50" />
        <KpiCard icon={<Users size={18} className="text-orange-500" />}
          label="ADR" value={`${fmtN(data.adr)} сом`}
          sub="средняя цена за ночь" color="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Выручка по месяцам */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Выручка по месяцам</h2>
          <MonthlyChart months={data.monthly} />
        </div>

        {/* Источники бронирований */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Источники</h2>
          <SourceChart sources={data.sources} total={data.bookings} />
        </div>
      </div>

      {/* Занятость по типам номеров */}
      {data.byType.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">По типам номеров</h2>
          <RoomTypeChart types={data.byType} />
        </div>
      )}
    </div>
  )
}

/* ── Вычисление метрик ── */
function calcMetrics(reservations, rooms, transactions, from, to) {
  const days      = differenceInDays(to, from) + 1
  const totalNights = rooms.length * days
  const confirmed = reservations.filter(r => !['cancelled','no_show'].includes(r.status))

  // Количество занятых ночей
  const occupiedNights = confirmed.reduce((sum, r) => {
    const nights = differenceInDays(new Date(r.check_out), new Date(r.check_in))
    return sum + Math.max(0, nights)
  }, 0)

  const revenue = confirmed.reduce((s, r) => s + (+r.total_amount || 0), 0)
  const occupancy = totalNights > 0 ? Math.round(occupiedNights / totalNights * 100) : 0
  const revpar = totalNights > 0 ? revenue / totalNights : 0
  const adr    = occupiedNights > 0 ? revenue / occupiedNights : 0

  // По месяцам
  const months = eachMonthOfInterval({ start: from, end: to }).map(m => {
    const label = format(m, 'MMM', { locale: ru })
    const mFrom = format(startOfMonth(m), 'yyyy-MM-dd')
    const mTo   = format(endOfMonth(m),   'yyyy-MM-dd')
    const mRevenue = confirmed
      .filter(r => r.check_in >= mFrom && r.check_in <= mTo)
      .reduce((s, r) => s + (+r.total_amount || 0), 0)
    return { label, revenue: mRevenue }
  })

  // По источникам
  const srcMap = {}
  reservations.forEach(r => { srcMap[r.source] = (srcMap[r.source] ?? 0) + 1 })
  const sources = Object.entries(srcMap).map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  // По типам номеров
  const typeMap = {}
  confirmed.forEach(r => {
    const room = rooms.find(rm => rm.id === r.room_id)
    if (!room) return
    if (!typeMap[room.type]) typeMap[room.type] = { bookings: 0, revenue: 0 }
    typeMap[room.type].bookings++
    typeMap[room.type].revenue += +r.total_amount || 0
  })
  const byType = Object.entries(typeMap).map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    revenue, occupancy, revpar, adr,
    bookings: reservations.length,
    occupiedNights, totalNights,
    monthly: months, sources, byType,
    reservations,
  }
}

/* ── Компоненты графиков ── */
function MonthlyChart({ months }) {
  const max = Math.max(...months.map(m => m.revenue), 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {months.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs font-medium text-slate-600">{fmtN(m.revenue)}</div>
          <div className="w-full flex items-end" style={{ height: '100px' }}>
            <div
              className="w-full bg-blue-500 rounded-t-lg transition-all"
              style={{ height: `${Math.max(4, (m.revenue / max) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">{m.label}</div>
        </div>
      ))}
    </div>
  )
}

function SourceChart({ sources, total }) {
  if (!sources.length) return <div className="text-slate-400 text-sm text-center py-8">Нет данных</div>
  return (
    <div className="space-y-3">
      {sources.map(s => (
        <div key={s.key}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-700">{SOURCE_LABEL[s.key] ?? s.key}</span>
            <span className="font-medium text-slate-800">
              {s.count} ({total > 0 ? Math.round(s.count / total * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${SOURCE_COLOR[s.key] ?? 'bg-slate-400'} rounded-full`}
              style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const TYPE_LABEL = { standard:'Стандарт', deluxe:'Делюкс', suite:'Люкс', family:'Семейный', economy:'Эконом' }

function RoomTypeChart({ types }) {
  const maxRev = Math.max(...types.map(t => t.revenue), 1)
  return (
    <div className="space-y-3">
      {types.map(t => (
        <div key={t.type} className="flex items-center gap-4">
          <div className="w-24 text-sm text-slate-600 shrink-0">{TYPE_LABEL[t.type] ?? t.type}</div>
          <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-lg flex items-center px-2 transition-all"
              style={{ width: `${(t.revenue / maxRev) * 100}%`, minWidth: '40px' }}
            >
              <span className="text-white text-xs font-medium">{t.bookings}</span>
            </div>
          </div>
          <div className="w-28 text-right text-sm font-medium text-slate-700 shrink-0">
            {fmtN(t.revenue)} сом
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-xl font-bold text-slate-800 leading-tight">{value}</div>
      <div className="text-sm font-medium text-slate-700 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}

/* ── Экспорт ── */
function exportCSV(data, hotel) {
  if (!data) return
  const rows = [
    ['Гость', 'Номер', 'Заезд', 'Выезд', 'Ночей', 'Сумма', 'Оплачено', 'Источник', 'Статус'],
    ...data.reservations.map(r => [
      r.guest_name ?? '',
      r.room_number ?? '',
      r.check_in,
      r.check_out,
      differenceInDays(new Date(r.check_out), new Date(r.check_in)),
      r.total_amount ?? 0,
      r.paid_amount ?? 0,
      SOURCE_LABEL[r.source] ?? r.source,
      r.status,
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${hotel.name}_аналитика_${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const fmtN = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n ?? 0))
