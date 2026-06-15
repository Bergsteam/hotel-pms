import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

// Ставки налогов КР (актуальные на 2024-2025)
const TAX_RATES = {
  ors: {
    name:    'ОРС — Единый налог',
    desc:    'Упрощённая система. Для гостиниц — 4% от выручки',
    rate:    0.04,
    calc:    (income) => income * 0.04,
    label:   (income) => `4% от ${new Intl.NumberFormat('ru-KG').format(income)} сом`,
  },
  nds: {
    name:    'НДС 12%',
    desc:    'Для плательщиков НДС. 12% от выручки за вычетом входящего НДС',
    rate:    0.12,
    calc:    (income) => income * 0.12,
    label:   (income) => `12% от ${new Intl.NumberFormat('ru-KG').format(income)} сом`,
  },
  patent: {
    name:    'Патент',
    desc:    'Фиксированный платёж. Сумма зависит от района и вида деятельности',
    rate:    null,
    calc:    () => null,
    label:   () => 'Фиксированная сумма — уточните в налоговой',
  },
}

export default function TaxTab({ hotel, summary }) {
  const [monthIncome, setMonthIncome] = useState(summary?.income ?? 0)
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)

  const fmt = (n) => n != null ? new Intl.NumberFormat('ru-KG').format(Math.round(n)) : '—'

  const taxMode = hotel?.tax_mode ?? 'ors'
  const tax = TAX_RATES[taxMode]
  const taxAmount = tax.calc(monthIncome)

  const loadPeriod = async () => {
    setLoading(true)
    const d = new Date(period + '-01')
    const { data } = await supabase
      .from('transactions')
      .select('amount')
      .eq('hotel_id', hotel.id)
      .eq('type', 'income')
      .gte('created_at', startOfMonth(d).toISOString())
      .lte('created_at', endOfMonth(d).toISOString())
    const total = (data ?? []).reduce((s, t) => s + +t.amount, 0)
    setMonthIncome(total)
    setLoading(false)
  }

  useEffect(() => { loadPeriod() }, [period, hotel?.id])

  return (
    <div className="max-w-lg space-y-4">
      {/* Выбор периода */}
      <div className="flex items-center gap-3">
        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-slate-500">
          {loading ? 'Загрузка...' : `Выручка: ${fmt(monthIncome)} сом`}
        </span>
      </div>

      {/* Карточка налогового режима */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800">{tax.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{tax.desc}</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
            Ваш режим
          </span>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="text-xs text-slate-500 mb-1">Расчёт за период</div>
          <div className="text-sm text-slate-600 mb-2">{tax.label(monthIncome)}</div>
          <div className="text-3xl font-bold text-slate-800">
            {taxAmount != null ? `${fmt(taxAmount)} сом` : 'По договорённости'}
          </div>
        </div>

        {taxAmount != null && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Выручка за период</span>
              <span className="font-medium">{fmt(monthIncome)} сом</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Налог ({(tax.rate * 100).toFixed(0)}%)</span>
              <span className="font-bold text-red-600">{fmt(taxAmount)} сом</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-medium text-slate-700">Чистая прибыль</span>
              <span className="font-bold text-emerald-700">
                {fmt(monthIncome - taxAmount)} сом
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Справка по режимам */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="text-xs font-semibold text-blue-800 mb-2">📋 Налоговые режимы КР</div>
        <div className="space-y-2">
          {Object.entries(TAX_RATES).map(([key, t]) => (
            <div key={key}
              className={`flex items-start gap-2 text-xs ${key === taxMode ? 'text-blue-800 font-medium' : 'text-blue-600'}`}
            >
              <span>{key === taxMode ? '▶' : '·'}</span>
              <span><b>{t.name}</b> — {t.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-500 mt-3">
          Изменить налоговый режим: Настройки → Об отеле
        </p>
      </div>

      {/* Сроки оплаты */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-2">⏰ Сроки уплаты налогов</div>
        <div className="space-y-1 text-xs text-slate-600">
          <div>• <b>ОРС</b> — ежеквартально, до 20-го числа следующего месяца</div>
          <div>• <b>НДС</b> — ежеквартально, до 20-го числа следующего месяца</div>
          <div>• <b>Патент</b> — до начала периода (обычно ежеквартально)</div>
        </div>
      </div>
    </div>
  )
}
