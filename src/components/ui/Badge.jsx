const variants = {
  free:      'bg-emerald-100 text-emerald-700',
  occupied:  'bg-red-100 text-red-700',
  cleaning:  'bg-yellow-100 text-yellow-700',
  checkout:  'bg-orange-100 text-orange-700',
  blocked:   'bg-slate-200 text-slate-600',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in:'bg-green-100 text-green-700',
  checked_out:'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-500',
  no_show:   'bg-orange-100 text-orange-600',
}

const labels = {
  free:       'Свободен',
  occupied:   'Занят',
  cleaning:   'Уборка',
  checkout:   'Выезд',
  blocked:    'Блокирован',
  confirmed:  'Подтверждено',
  checked_in: 'Заселён',
  checked_out:'Выехал',
  cancelled:  'Отменено',
  no_show:    'Не явился',
}

export default function Badge({ status, children }) {
  const cls = variants[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {children ?? labels[status] ?? status}
    </span>
  )
}
