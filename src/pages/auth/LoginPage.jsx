import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hotel } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Неверный email или пароль')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Лого */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hotel size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hotel PMS</h1>
          <p className="text-slate-400 text-sm mt-1">Система управления гостиницей</p>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Вход в систему</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="manager@hotel.kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              Зарегистрировать гостиницу
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
