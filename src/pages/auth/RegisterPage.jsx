import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hotel } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    hotelName: '', city: 'Каракол', phone: '',
    fullName: '', email: '', password: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setError('')
    setLoading(true)
    try {
      // 1. Создаём пользователя
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: 'owner' } },
      })
      if (authErr) throw authErr

      // 2. Ждём установки сессии
      if (authData.session) {
        await supabase.auth.setSession(authData.session)
      }

      // 3. Создаём отель и привязываем профиль через RPC (обходит RLS)
      const { error: rpcErr } = await supabase.rpc('create_hotel_for_user', {
        hotel_name:     form.hotelName,
        hotel_city:     form.city,
        hotel_phone:    form.phone,
        user_full_name: form.fullName,
      })
      if (rpcErr) throw rpcErr

      navigate('/')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hotel size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hotel PMS</h1>
          <p className="text-slate-400 text-sm mt-1">Регистрация гостиницы</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {/* Прогресс */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>{n}</div>
                <span className={`text-xs ${step >= n ? 'text-slate-700' : 'text-slate-400'}`}>
                  {n === 1 ? 'О гостинице' : 'Ваш аккаунт'}
                </span>
                {n < 2 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Название гостиницы *
                  </label>
                  <input
                    required value={form.hotelName}
                    onChange={e => set('hotelName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Гостевой дом «Иссык-Куль»"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Город</label>
                  <select
                    value={form.city} onChange={e => set('city', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['Каракол','Чолпон-Ата','Балыкчи','Бишкек','Ош','Другой'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                  <input
                    type="tel" value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+996 700 000 000"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ваше имя *</label>
                  <input
                    required value={form.fullName}
                    onChange={e => set('fullName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Азиз Мамытбеков"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="owner@hotel.kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Пароль *</label>
                  <input
                    type="password" required minLength={6} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Минимум 6 символов"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm hover:bg-slate-50"
                >
                  Назад
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Создаём...' : step === 1 ? 'Далее' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">Войти</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
