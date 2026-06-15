import { useState, useEffect } from 'react'
import { BedDouble, CalendarCheck, TrendingUp, Users, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

export default function DashboardPage() {
  const { hotel, profile } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hotel) { setLoading(false); return }
    const load = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')

      const [
        { data: rooms },
        { data: todayArrivals },
        { data: todayDepartures },
        { data: recentRes },
      ] = await Promise.all([
        supabase.from('rooms').select('status').eq('hotel_id', hotel.id),
        supabase.from('reservations').select('*').eq('hotel_id', hotel.id).eq('check_in', today),
        supabase.from('reservations').select('*').eq('hotel_id', hotel.id).eq('check_out', today),
        supabase.from('reservations')
          .select('*, rooms(number)')
          .eq('hotel_id', hotel.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const roomStats = (rooms ?? []).reduce((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        acc.total++
        return acc
      }, { total: 0 })

      const occupancy = roomStats.total > 0
        ? Math.round((roomStats.occupied ?? 0) / roomStats.total * 100)
        : 0

      setData({ roomStats, occupancy, todayArrivals: todayArrivals ?? [], todayDepartures: todayDepartures ?? [], recentRes: recentRes ?? [] })
      setLoading(false)
    }
    load()
  }, [hotel?.id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Spinner size="lg" />
    </div>
  )

  if (!data || !hotel) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <h2 className="font-semibold text-yellow-800 mb-1">Отель не настроен</h2>
        <p className="text-sm text-yellow-700">Профиль не привязан к отелю. Обратитесь к администратору.</p>
      </div>
    </div>
  )

  const { roomStats, occupancy, todayArrivals, todayDepartures, recentRes } = data

  const fmt = (s) => new Intl.NumberFormat('ru-KG').format(s)

  return (
    <div className="p-6 space-y-6">
      {/* Приветствие */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Добро пожаловать, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: ru })} · {hotel?.name}
        </p>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<BedDouble size={20} className="text-blue-600" />}
          label="Загруженность"
          value={`${occupancy}%`}
          sub={`${roomStats.occupied ?? 0} из ${roomStats.total} номеров`}
          color="bg-blue-50"
        />
        <KpiCard
          icon={<CalendarCheck size={20} className="text-emerald-600" />}
          label="Заезд сегодня"
          value={todayArrivals.length}
          sub="новых гостей"
          color="bg-emerald-50"
        />
        <KpiCard
          icon={<ArrowRight size={20} className="text-orange-600" />}
          label="Выезд сегодня"
          value={todayDepartures.length}
          sub="освободятся"
          color="bg-orange-50"
        />
        <KpiCard
          icon={<BedDouble size={20} className="text-slate-500" />}
          label="Свободно"
          value={roomStats.free ?? 0}
          sub="готовых номеров"
          color="bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Статусы номеров */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Номера сейчас</h2>
            <Link to="/rooms" className="text-xs text-blue-600 hover:underline">Карта →</Link>
          </div>
          <div className="space-y-3">
            {[
              { key: 'free',     label: 'Свободны',    color: 'bg-emerald-500' },
              { key: 'occupied', label: 'Заняты',       color: 'bg-red-500' },
              { key: 'cleaning', label: 'Уборка',       color: 'bg-yellow-500' },
              { key: 'checkout', label: 'Выезд',        color: 'bg-orange-500' },
              { key: 'blocked',  label: 'Заблокированы', color: 'bg-slate-400' },
            ].map(s => {
              const count = roomStats[s.key] ?? 0
              const pct = roomStats.total > 0 ? Math.round(count / roomStats.total * 100) : 0
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-medium text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Последние бронирования */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Последние бронирования</h2>
            <Link to="/reservations" className="text-xs text-blue-600 hover:underline">Все →</Link>
          </div>
          {recentRes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Бронирований пока нет</div>
          ) : (
            <div className="space-y-3">
              {recentRes.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{r.guest_name}</div>
                    <div className="text-xs text-slate-400">
                      № {r.rooms?.number} · {format(new Date(r.check_in), 'd MMM', { locale: ru })} — {format(new Date(r.check_out), 'd MMM', { locale: ru })}
                    </div>
                  </div>
                  <Badge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Сегодня: заезды и выезды */}
      {(todayArrivals.length > 0 || todayDepartures.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {todayArrivals.length > 0 && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
              <h2 className="font-semibold text-emerald-800 mb-3">Заезжают сегодня</h2>
              {todayArrivals.map(r => (
                <div key={r.id} className="text-sm text-emerald-700 py-1 border-b border-emerald-100 last:border-0">
                  {r.guest_name} · {r.adults + r.children} гостей
                </div>
              ))}
            </div>
          )}
          {todayDepartures.length > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-5">
              <h2 className="font-semibold text-orange-800 mb-3">Выезжают сегодня</h2>
              {todayDepartures.map(r => (
                <div key={r.id} className="text-sm text-orange-700 py-1 border-b border-orange-100 last:border-0">
                  {r.guest_name} · {r.adults + r.children} гостей
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}
