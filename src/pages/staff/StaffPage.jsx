import { useState, useEffect } from 'react'
import { Users, CalendarDays, Banknote } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import StaffTab from './StaffTab'
import ShiftsTab from './ShiftsTab'
import SalaryTab from './SalaryTab'

export default function StaffPage() {
  const { hotel } = useAuthStore()
  const [tab, setTab]     = useState('staff')
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const loadStaff = async () => {
    if (!hotel) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('hotel_id', hotel.id)
      .eq('active', true)
      .order('full_name')
    setStaff(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadStaff() }, [hotel?.id])

  const tabs = [
    { key: 'staff',  label: 'Сотрудники', icon: Users },
    { key: 'shifts', label: 'Смены',       icon: CalendarDays },
    { key: 'salary', label: 'Зарплата',    icon: Banknote },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Персонал</h1>
        <p className="text-sm text-slate-500 mt-0.5">{staff.length} сотрудников</p>
      </div>

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

      {tab === 'staff'  && <StaffTab  staff={staff} hotel={hotel} onReload={loadStaff} />}
      {tab === 'shifts' && <ShiftsTab staff={staff} hotel={hotel} />}
      {tab === 'salary' && <SalaryTab staff={staff} hotel={hotel} />}
    </div>
  )
}
