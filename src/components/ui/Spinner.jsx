export default function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className={`${s} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`} />
  )
}
