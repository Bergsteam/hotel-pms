import { useState, useEffect } from 'react'
import { Plus, X, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

const CATEGORIES = ['Завтрак', 'Супы', 'Основное', 'Гарниры', 'Салаты', 'Десерты', 'Напитки', 'Другое']

const fmt = (n) => new Intl.NumberFormat('ru-KG').format(Math.round(n))

export default function MenuTab({ hotel, onReload }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [filterCat, setFilterCat] = useState('Все')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', hotel.id)
      .order('category')
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotel?.id])

  const toggleAvail = async (item) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id)
    load()
    onReload()
  }

  const cats = ['Все', ...Array.from(new Set(items.map(i => i.category)))]
  const filtered = filterCat === 'Все' ? items : items.filter(i => i.category === filterCat)

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCat === c
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Добавить блюдо
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">🍽️</div>
          <div className="text-sm">Меню пустое — добавьте блюда</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Блюдо</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Категория</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Цена</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{item.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {fmt(item.price)} сом
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleAvail(item)} className="transition-colors">
                      {item.available
                        ? <ToggleRight size={22} className="text-emerald-500" />
                        : <ToggleLeft  size={22} className="text-slate-300" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditItem(item); setShowForm(true) }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <MenuItemModal
          item={editItem}
          hotel={hotel}
          onClose={() => setShowForm(false)}
          onSaved={() => { load(); onReload() }}
        />
      )}
    </div>
  )
}

function MenuItemModal({ item, hotel, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    name:        item?.name        ?? '',
    category:    item?.category    ?? 'Основное',
    price:       item?.price       ?? '',
    description: item?.description ?? '',
    available:   item?.available   ?? true,
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, price: +form.price, hotel_id: hotel.id }
    if (isEdit) {
      await supabase.from('menu_items').update(payload).eq('id', item.id)
    } else {
      await supabase.from('menu_items').insert(payload)
    }
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить «${item.name}»?`)) return
    await supabase.from('menu_items').delete().eq('id', item.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Название *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Лагман, Плов, Чай..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Категория</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Цена (сом) *</label>
              <input type="number" min="0" required value={form.price} onChange={e => set('price', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Описание</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Состав, особенности..." />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)}
              className="w-4 h-4 rounded accent-orange-600" />
            <span className="text-sm text-slate-700">Доступно в меню</span>
          </label>

          <div className="flex gap-2 pt-1">
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
              >
                Удалить
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
