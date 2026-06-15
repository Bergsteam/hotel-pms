import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Clock, CheckCircle2, Truck, X, ChefHat } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

const STATUS_FLOW = {
  new:       { label: 'Новый',       color: 'bg-blue-100 text-blue-700 border-blue-200',    next: 'preparing', nextLabel: 'В работу →', icon: Clock },
  preparing: { label: 'Готовится',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', next: 'ready',  nextLabel: 'Готово ✓',  icon: ChefHat },
  ready:     { label: 'Готово',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200', next: 'delivered', nextLabel: 'Доставлено', icon: CheckCircle2 },
  delivered: { label: 'Доставлен',   color: 'bg-slate-100 text-slate-500 border-slate-200', next: null,        nextLabel: null,          icon: Truck },
  cancelled: { label: 'Отменён',     color: 'bg-red-100 text-red-500 border-red-200',       next: null,        nextLabel: null,          icon: X },
}

const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

export default function OrdersTab({ hotel }) {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('active')

  const load = async () => {
    setLoading(true)
    let q = supabase
      .from('orders')
      .select('*, rooms(number), order_items(id, name, qty, price)')
      .eq('hotel_id', hotel.id)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      q = q.in('status', ['new', 'preparing', 'ready'])
    } else {
      q = q.in('status', ['delivered', 'cancelled'])
    }

    const { data } = await q.limit(50)
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id, filter])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `hotel_id=eq.${hotel.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [hotel?.id])

  const advance = async (order) => {
    const nextStatus = STATUS_FLOW[order.status]?.next
    if (!nextStatus) return
    await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)
    load()
  }

  const cancel = async (order) => {
    if (!confirm('Отменить заказ?')) return
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    load()
  }

  const activeCount = orders.filter(o => ['new','preparing'].includes(o.status)).length

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      {/* Фильтр */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            Активные
            {activeCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'done' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            История
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">🍳</div>
          <div className="text-sm">
            {filter === 'active' ? 'Нет активных заказов' : 'История пуста'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const st = STATUS_FLOW[order.status] ?? STATUS_FLOW.new
            const Icon = st.icon
            return (
              <div key={order.id} className={`bg-white border rounded-xl overflow-hidden ${st.color.includes('blue') ? 'border-blue-200' : st.color.includes('yellow') ? 'border-yellow-200' : st.color.includes('emerald') ? 'border-emerald-200' : 'border-slate-200'}`}>
                {/* Шапка */}
                <div className={`px-4 py-3 flex items-center justify-between border-b ${st.color}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} />
                    <span className="font-semibold text-sm">{st.label}</span>
                  </div>
                  <div className="text-xs opacity-70">
                    {format(new Date(order.created_at), 'HH:mm', { locale: ru })}
                    {order.rooms?.number && ` · Номер ${order.rooms.number}`}
                  </div>
                </div>

                {/* Позиции */}
                <div className="p-4">
                  {order.guest_name && (
                    <div className="text-xs text-slate-500 mb-2">Гость: <span className="font-medium text-slate-700">{order.guest_name}</span></div>
                  )}
                  <div className="space-y-1 mb-3">
                    {(order.order_items ?? []).map((it, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-700">{it.qty}× {it.name}</span>
                        <span className="text-slate-500">{fmt(it.price * it.qty)}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <div className="text-xs text-slate-400 italic mb-3 bg-slate-50 px-2 py-1.5 rounded-lg">
                      {order.notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{fmt(order.total_amount)} сом</span>
                    <div className="flex gap-2">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button onClick={() => cancel(order)}
                          className="px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
                        >
                          Отменить
                        </button>
                      )}
                      {st.next && (
                        <button onClick={() => advance(order)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          {st.nextLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
