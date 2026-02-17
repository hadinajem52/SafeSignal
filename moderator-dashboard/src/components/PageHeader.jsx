import React from 'react'

function PageHeader({ title, description, icon: Icon, iconClassName = 'text-primary' }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className={iconClassName} size={28} /> : null}
        <h1 className="text-3xl font-bold text-text">{title}</h1>
      </div>
      {description ? <p className="text-muted mt-2">{description}</p> : null}
    </div>
  )
}

export default PageHeader
