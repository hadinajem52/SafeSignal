import React from 'react'

function PageHeader({ title, description, icon: Icon, iconClassName = 'text-blue-600' }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className={iconClassName} size={28} /> : null}
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      {description ? <p className="text-gray-600 mt-2">{description}</p> : null}
    </div>
  )
}

export default PageHeader
