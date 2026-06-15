import { useState } from 'react'
import { Users, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const STATUS_CONFIG = {
  free:     { bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', dot: 'bg-emerald-500', label: 'Свободен' },
  occupied: { bg: 'bg-red-50 border-red-200 hover:bg-red-100',             dot: 'bg-red-500',     label: 'Занят' },
  cleaning: { bg: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',    dot: 'bg-yellow-500',  label: 'Уборка' },
  checkout: { bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100',    dot: 'bg-orange-500',  label: 'Выезд' },
  blocked:  { bg: 'bg-slate-100 border-slate-200 hover:bg-slate-200',      dot: 'bg-slate-400',   label: 'Блок' },
}

const TYPE_LABEL = {
  standard: 'Стандарт',
  deluxe:   'Делюкс',
  suite:    'Люкс',
  family:   'Семейный',
  economy:  'Эконом',
}

export default function RoomCard({ room, onClick }) {
  const [showQr, setShowQr] = useState(false)
  const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.free
  const price = new Intl.NumberFormat('ru-KG', { style: 'currency', currency: 'KGS', maximumFractionDigits: 0 })
    .format(room.price_per_night)
  const qrUrl = `${window.location.origin}/qr/${room.id}`

  return (
    <>
      <div className={`relative w-full border rounded-xl p-3 transition-all ${cfg.bg}`}>
        {/* Статус-точка */}
        <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

        {/* Кнопка QR */}
        <button
          onClick={e => { e.stopPropagation(); setShowQr(true) }}
          className="absolute bottom-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          title="QR-код для горничной"
        >
          <QrCode size={14} />
        </button>

        {/* Основной клик */}
        <button onClick={onClick} className="w-full text-left">
          <div className="text-xl font-bold text-slate-800 mb-0.5">№ {room.number}</div>
          <div className="text-xs text-slate-500 mb-2">{TYPE_LABEL[room.type] ?? room.type}</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-slate-600">
              <Users size={12} />
              <span className="text-xs">{room.capacity}</span>
            </div>
            <span className="text-xs font-medium text-slate-700">{price}</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-600">{cfg.label}</div>
        </button>
      </div>

      {/* QR попап */}
      {showQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQr(false)}
        >
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-slate-800 text-lg">Номер {room.number}</div>
                <div className="text-xs text-slate-500">QR для горничной</div>
              </div>
              <button onClick={() => setShowQr(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <QRCodeSVG value={qrUrl} size={200} level="M"
              className="mx-auto rounded-xl"
            />
            <p className="text-xs text-slate-400 mt-3 break-all">{qrUrl}</p>
            <button
              onClick={() => window.print()}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Распечатать
            </button>
          </div>
        </div>
      )}
    </>
  )
}
