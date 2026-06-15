import { useState, useEffect } from 'react'
import { ChefHat, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import OrdersTab from './OrdersTab'
import MenuTab from './MenuTab'
import RoomServiceTab from './RoomServiceTab'

const TABS = [
  { id: 'orders', label: 'Заказы',       icon: ChefHat },
  { id: 'service', label: 'Рум-сервис',  icon: ShoppingBag },
  { id: 'menu',   label: 'Меню',         icon: UtensilsCrossed },
]

export default function KitchenPage() {
  const { hotel } = useAuthStore()
  const [tab, setTab] = useState('orders')
  const [menuItems, setMenuItems] = useState([])
  const [rooms, setRooms]         = useState([])
  const [loading, setLoading]     = useState(true)

  const loadBase = async () => {
    if (!hotel) return
    setLoading(true)
    const [{ data: menu }, { data: roomList }] = await Promise.all([
      supabase.from('menu_items').select('*').eq('hotel_id', hotel.id).eq('available', true).order('category').order('name'),
      supabase.from('rooms').select('id, number, type').eq('hotel_id', hotel.id).order('number'),
    ])
    setMenuItems(menu ?? [])
    setRooms(roomList ?? [])
    setLoading(false)
  }

  useEffect(() => { loadBase() }, [hotel?.id])

  if (!hotel) return null
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <ChefHat size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Кухня и ресторан</h1>
          <p className="text-sm text-slate-500">Заказы, меню, рум-сервис</p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders'  && <OrdersTab hotel={hotel} menuItems={menuItems} rooms={rooms} />}
      {tab === 'service' && <RoomServiceTab hotel={hotel} menuItems={menuItems} rooms={rooms} />}
      {tab === 'menu'    && <MenuTab hotel={hotel} onReload={loadBase} />}
    </div>
  )
}
