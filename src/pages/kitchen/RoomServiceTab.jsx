import { useState, useMemo } from 'react'
import { Plus, Minus, ShoppingBag, X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

export default function RoomServiceTab({ hotel, menuItems, rooms }) {
  const [selectedRoom, setSelectedRoom] = useState('')
  const [guestName, setGuestName]       = useState('')
  const [notes, setNotes]               = useState('')
  const [cart, setCart]                 = useState([])
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState(false)

  const categories = useMemo(() =>
    Array.from(new Set(menuItems.map(i => i.category))),
    [menuItems]
  )

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id)
      if (!existing) return prev
      if (existing.qty === 1) return prev.filter(c => c.id !== id)
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const qtyInCart = (id) => cart.find(c => c.id === id)?.qty ?? 0

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)

  const handleSubmit = async () => {
    if (cart.length === 0) return
    setLoading(true)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        hotel_id:   hotel.id,
        room_id:    selectedRoom || null,
        guest_name: guestName || null,
        notes:      notes || null,
        total_amount: total,
        status:     'new',
      })
      .select()
      .single()

    if (error) { alert(error.message); setLoading(false); return }

    await supabase.from('order_items').insert(
      cart.map(c => ({
        order_id:     order.id,
        menu_item_id: c.id,
        name:         c.name,
        price:        c.price,
        qty:          c.qty,
      }))
    )

    setCart([])
    setSelectedRoom('')
    setGuestName('')
    setNotes('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Меню — левая часть */}
      <div className="lg:col-span-2 space-y-5">
        {categories.map(cat => {
          const catItems = menuItems.filter(i => i.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catItems.map(item => {
                  const qty = qtyInCart(item.id)
                  return (
                    <div key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-orange-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-400 truncate">{item.description}</div>
                        )}
                        <div className="text-orange-600 font-semibold text-sm mt-0.5">{fmt(item.price)} сом</div>
                      </div>

                      {qty === 0 ? (
                        <button onClick={() => addToCart(item)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div className="shrink-0 flex items-center gap-1">
                          <button onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-slate-800">{qty}</span>
                          <button onClick={() => addToCart(item)}
                            className="w-7 h-7 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {menuItems.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🍽️</div>
            <div className="text-sm">Меню пустое — сначала добавьте блюда во вкладке «Меню»</div>
          </div>
        )}
      </div>

      {/* Корзина — правая часть */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <ShoppingBag size={16} className="text-orange-600" />
            <span className="font-semibold text-slate-800 text-sm">Заказ</span>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="ml-auto p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Номер комнаты */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Номер комнаты</label>
              <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— Ресторан / не указан —</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Номер {r.number}</option>
                ))}
              </select>
            </div>

            {/* Имя гостя */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Имя гостя</label>
              <input value={guestName} onChange={e => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Необязательно" />
            </div>

            {/* Позиции корзины */}
            {cart.length > 0 ? (
              <>
                <div className="border-t border-slate-100 pt-3 space-y-1.5">
                  {cart.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {c.qty}
                        </span>
                        <span className="text-slate-700 truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-500">{fmt(c.price * c.qty)}</span>
                        <button onClick={() => setCart(prev => prev.filter(x => x.id !== c.id))}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Заметка */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Пожелания</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    placeholder="Без острого, аллергия..." />
                </div>

                {/* Итог */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Итого</span>
                  <span className="font-bold text-lg text-slate-800">{fmt(total)} сом</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {loading ? 'Отправляем...' : 'Отправить на кухню'}
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-300 text-sm">
                Добавьте блюда из меню
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm text-center py-2.5 rounded-xl">
                ✓ Заказ отправлен на кухню!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
