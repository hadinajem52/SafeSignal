import React from 'react'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

export function SkeletonLoader({ className = '' }) {
    return (
        <div className={`animate-pulse bg-surface rounded-md ${className}`}></div>
    )
}

export function EmptyState({ icon: Icon = Inbox, title = 'No data available', description, className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex flex-col items-center justify-center p-6 text-center ${className}`}
        >
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3">
                <Icon size={24} className="text-muted" />
            </div>
            <p className="text-sm font-semibold text-text">{title}</p>
            {description && <p className="text-xs text-muted mt-1 max-w-[250px]">{description}</p>}
        </motion.div>
    )
}
