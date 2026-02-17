import React from 'react'
import { AlertCircle } from 'lucide-react'
import ToggleSettingRow from './ToggleSettingRow'

function NotificationSettings({
  settings,
  isMutating,
  onEmailNotificationsChange,
  onReportAlertsChange,
  onWeeklyDigestChange,
  onSendDigestNow,
  digestPending,
}) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
        <AlertCircle size={24} />
        Notification Settings
      </h2>

      <div className="space-y-4">
        <ToggleSettingRow
          label="Email Notifications"
          description="Receive email notifications for report updates"
          checked={settings.emailNotifications}
          onChange={onEmailNotificationsChange}
          disabled={isMutating}
        />

        <ToggleSettingRow
          label="Report Alerts"
          description="Get notified immediately for high-severity reports"
          checked={settings.reportAlerts}
          onChange={onReportAlertsChange}
          disabled={isMutating}
        />

        <ToggleSettingRow
          label="Weekly Digest"
          description="Receive a weekly summary of moderation activities"
          checked={settings.weeklyDigest}
          onChange={onWeeklyDigestChange}
          disabled={isMutating}
        />

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-900 mb-3">
            Weekly digest is sent automatically every week. You can also send one immediately.
          </p>
          <button
            onClick={onSendDigestNow}
            disabled={isMutating || !settings.weeklyDigest}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {digestPending ? 'Sending Digest...' : 'Send Weekly Digest Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
