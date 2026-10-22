import type { ReactNode } from 'react'

export function Boton({ children, variant = 'primary', ...p }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700'
    : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-white border text-slate-700 hover:bg-slate-50'
  return <button {...p} className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${cls} ${p.className ?? ''}`}>{children}</button>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border p-4 ${className}`}>{children}</div>
}

export function Campo({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}

export const inputCls = 'w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
