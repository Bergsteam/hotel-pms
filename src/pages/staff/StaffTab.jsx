import { useState } from 'react'
import { Plus, X, Phone, Mail, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ROLES = [
  { value: 'manager',     label: 'Менеджер',    color: 'bg-purple-100 text-purple-700' },
  { value: 'reception',   label: 'Ресепшн',     color: 'bg-blue-100 text-blue-700' },
  { value: 'housekeeper', label: 'Горничная',   color: 'bg-yellow-100 text-yellow-700' },
  { value: 'chef',        label: 'Повар',       color: 'bg-orange-100 text-orange-700' },
  { value: 'owner',       label: 'Владелец',    color: 'bg-slate-100 text-slate-700' },
]

const roleColor = (r) => ROLES.find(x => x.value === r)?.color ?? 'bg-slate-100 text-slate-600'
const roleLabel = (r) => ROLES.find(x => x.value === r)?.label ?? r

export default function StaffTab({ staff, hotel, onReload }) {
  const [showForm, setShowForm]   = useState(false)
  const [editStaff, setEditStaff] = useState(null)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditStaff(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Пригласить сотрудника
        </button>
      </div>

      {/* Список */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.map(s => (
          <div key={s.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors cursor-pointer"
            onClick={() => { setEditStaff(s); setShowForm(true) }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(s.full_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-slate-800 truncate">{s.full_name}</div>
                  {s.active === false && (
                    <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full shrink-0">заблок.</span>
                  )}
                </div>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${roleColor(s.role)}`}>
                  {roleLabel(s.role)}
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {s.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={11} /> {s.phone}
                </div>
              )}
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <div className="text-sm">Сотрудников пока нет</div>
          </div>
        )}
      </div>

      {showForm && (
        <StaffModal
          staff={editStaff}
          hotel={hotel}
          onClose={() => setShowForm(false)}
          onSaved={onReload}
        />
      )}
    </div>
  )
}

function StaffModal({ staff, hotel, onClose, onSaved }) {
  const isEdit = !!staff
  const [form, setForm] = useState({
    full_name: staff?.full_name ?? '',
    phone:     staff?.phone     ?? '',
    role:      staff?.role      ?? 'reception',
    email:     '',
    password:  '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isEdit) {
        // Обновляем профиль
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name,
          phone:     form.phone,
          role:      form.role,
        }).eq('id', staff.id)
        if (error) throw error
        onSaved()
        onClose()
      } else {
        // Создаём нового сотрудника через signUp
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email:    form.email,
          password: form.password,
          options:  { data: { full_name: form.full_name, role: form.role } },
        })
        if (authErr) throw authErr

        // Привязываем к отелю
        if (authData.user) {
          await supabase.from('profiles').update({
            hotel_id:  hotel.id,
            full_name: form.full_name,
            role:      form.role,
            phone:     form.phone,
          }).eq('id', authData.user.id)
        }

        setSuccess(`Сотрудник создан! Логин: ${form.email} / Пароль: ${form.password}`)
        onSaved()
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleDeactivate = async () => {
    if (!confirm(`Заблокировать ${staff.full_name}? Они не смогут войти в систему.`)) return
    const { error } = await supabase.rpc('ban_staff_user', { target_user_id: staff.id })
    if (error) { setError(error.message); return }
    onSaved()
    onClose()
  }

  const handleActivate = async () => {
    if (!confirm(`Восстановить доступ для ${staff.full_name}?`)) return
    const { error } = await supabase.rpc('unban_staff_user', { target_user_id: staff.id })
    if (error) { setError(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? staff.full_name : 'Новый сотрудник'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="p-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              <div className="font-semibold mb-1">✓ {success}</div>
              <div className="text-xs text-emerald-600">Сохраните данные и передайте сотруднику</div>
            </div>
            <button onClick={onClose}
              className="mt-4 w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Имя *</label>
              <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Айгуль Матанова" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Телефон</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+996 700 000 000" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Роль</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.filter(r => r.value !== 'owner').map(r => (
                  <label key={r.value}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      form.role === r.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" name="role" value={r.value}
                      checked={form.role === r.value}
                      onChange={() => set('role', r.value)} className="hidden" />
                    <Shield size={13} /> {r.label}
                  </label>
                ))}
              </div>
            </div>

            {!isEdit && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="staff@hotel.kg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Пароль *</label>
                  <input type="text" required minLength={6} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Минимум 6 символов" />
                  <p className="text-xs text-slate-400 mt-1">
                    Запишите пароль — передайте сотруднику после создания
                  </p>
                </div>
              </>
            )}

            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div className="flex gap-2 pt-1">
              {isEdit && (
                staff.active !== false
                  ? <button type="button" onClick={handleDeactivate}
                      className="px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
                    >
                      🔒 Заблокировать
                    </button>
                  : <button type="button" onClick={handleActivate}
                      className="px-3 py-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs transition-colors"
                    >
                      ✓ Восстановить
                    </button>
              )}
              <button type="button" onClick={onClose}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm"
              >
                Отмена
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
