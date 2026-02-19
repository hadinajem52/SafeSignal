import React from 'react'

function PageHeader({ title, description, icon: Icon, iconClassName = 'text-primary' }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2.5">
        {Icon ? <Icon className={iconClassName} size={24} /> : null}
        <h1 className="text-2xl font-bold text-text">{title}</h1>
      </div>
      {description ? <p className="text-sm text-muted mt-1">{description}</p> : null}
    </div>
  )
}

export default PageHeader
