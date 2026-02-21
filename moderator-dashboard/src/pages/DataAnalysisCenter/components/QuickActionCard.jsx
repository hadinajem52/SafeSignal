import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function QuickActionCard({ icon: Icon, label, sub, to }) {
  const navigate = useNavigate()
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => to && navigate(to)}
      aria-label={`${label}, ${sub}`}
      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 flex-1 min-w-[130px] hover:bg-surface transition-colors group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text truncate font-display">{label}</p>
        <p className="text-[10px] text-muted truncate mt-0.5">{sub}</p>
      </div>
      <div className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted group-hover:text-primary group-hover:border-primary transition-colors flex-shrink-0">
        <Icon size={11} />
      </div>
    </motion.button>
  )
}
