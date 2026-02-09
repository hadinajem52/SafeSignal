import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, AlertCircle, RotateCcw } from 'lucide-react'
import { settingsAPI } from '../services/api'

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  reportAlerts: true,
  weeklyDigest: false,
  autoVerify: false,
  minConfidenceScore: 80,
}

function SettingsPage() {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Settings saved successfully!')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    data: persistedSettings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: async () => {
      const result = await settingsAPI.get()
      if (result.success) return result.data
      throw new Error(result.error)
    },
  })

  useEffect(() => {
    if (persistedSettings) {
      setSettings(persistedSettings)
      setErrorMessage('')
    }
  }, [persistedSettings])

  useEffect(() => {
    if (!saved) return undefined

    const timeout = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(timeout)
  }, [saved])

  const hasChanges = useMemo(() => {
    if (!persistedSettings) return false
    return JSON.stringify(settings) !== JSON.stringify(persistedSettings)
  }, [settings, persistedSettings])

  const saveMutation = useMutation({
    mutationFn: async (nextSettings) => {
      const result = await settingsAPI.update(nextSettings)
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['dashboardSettings'], updatedSettings)
      setSettings(updatedSettings)
      setSuccessMessage('Settings saved successfully!')
      setErrorMessage('')
      setSaved(true)
    },
    onError: (mutationError) => {
      setSaved(false)
      setErrorMessage(mutationError.message || 'Failed to save settings')
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.reset()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (resetSettings) => {
      queryClient.setQueryData(['dashboardSettings'], resetSettings)
      setSettings(resetSettings)
      setSuccessMessage('Settings reset to defaults.')
      setErrorMessage('')
      setSaved(true)
    },
    onError: (mutationError) => {
      setSaved(false)
      setErrorMessage(mutationError.message || 'Failed to reset settings')
    },
  })

  const digestMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.sendWeeklyDigestNow()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (digestResult) => {
      setSuccessMessage(
        `Weekly digest sent. ${digestResult?.summary?.total_reports ?? 0} reports in the last 7 days.`
      )
      setErrorMessage('')
      setSaved(true)
    },
    onError: (mutationError) => {
      setSaved(false)
      setErrorMessage(mutationError.message || 'Failed to send weekly digest')
    },
  })

  const isMutating = saveMutation.isPending || resetMutation.isPending || digestMutation.isPending

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setSaved(false)
    saveMutation.mutate(settings)
  }

  const handleReset = () => {
    setSaved(false)
    resetMutation.mutate()
  }

  const handleSendDigestNow = () => {
    setSaved(false)
    digestMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-red-600 mb-4">{error?.message || 'Failed to load settings'}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure dashboard preferences and system settings</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={24} />
            Notification Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive email notifications for report updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                  disabled={isMutating}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Report Alerts</p>
                <p className="text-sm text-gray-600">Get notified immediately for high-severity reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reportAlerts}
                  onChange={(e) => updateSetting('reportAlerts', e.target.checked)}
                  className="sr-only peer"
                  disabled={isMutating}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Weekly Digest</p>
                <p className="text-sm text-gray-600">Receive a weekly summary of moderation activities</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weeklyDigest}
                  onChange={(e) => updateSetting('weeklyDigest', e.target.checked)}
                  className="sr-only peer"
                  disabled={isMutating}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-900 mb-3">
                Weekly digest is sent automatically every week. You can also send one immediately.
              </p>
              <button
                onClick={handleSendDigestNow}
                disabled={isMutating || !settings.weeklyDigest}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {digestMutation.isPending ? 'Sending Digest...' : 'Send Weekly Digest Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Moderation Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={24} />
            Moderation Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Auto-Verify Reports</p>
                <p className="text-sm text-gray-600">Automatically verify reports with high confidence</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoVerify}
                  onChange={(e) => updateSetting('autoVerify', e.target.checked)}
                  className="sr-only peer"
                  disabled={isMutating}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Minimum Confidence Score for Auto-Verification: {settings.minConfidenceScore}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.minConfidenceScore}
                onChange={(e) => updateSetting('minConfidenceScore', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isMutating}
              />
              <p className="text-sm text-gray-600 mt-2">Only reports above this score will be auto-verified</p>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Dashboard Version</p>
              <p className="font-bold text-gray-900">1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">API Version</p>
              <p className="font-bold text-gray-900">1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-bold text-gray-900">Jan 25, 2024</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-bold text-green-600">Operational</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isMutating}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleReset}
            disabled={isMutating}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={20} />
            {resetMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
