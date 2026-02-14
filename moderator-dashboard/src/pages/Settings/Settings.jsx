import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import LoadingState from '../../components/LoadingState'
import { useAuth } from '../../context/AuthContext'
import { settingsAPI } from '../../services/api'
import { applyDarkMode, persistDarkMode } from '../../utils/theme'
import AppearanceSettings from './AppearanceSettings'
import ModerationSettings from './ModerationSettings'
import NotificationSettings from './NotificationSettings'
import SettingsActions from './SettingsActions'
import SystemInfoSection from './SystemInfoSection'

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  reportAlerts: true,
  weeklyDigest: false,
  darkMode: false,
  autoVerify: false,
  minConfidenceScore: 80,
}

function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
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
      if (typeof persistedSettings.darkMode === 'boolean') {
        applyDarkMode(persistedSettings.darkMode)
        persistDarkMode(persistedSettings.darkMode)
      }
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
      if (typeof updatedSettings.darkMode === 'boolean') {
        applyDarkMode(updatedSettings.darkMode)
        persistDarkMode(updatedSettings.darkMode)
      }
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
      if (typeof resetSettings.darkMode === 'boolean') {
        applyDarkMode(resetSettings.darkMode)
        persistDarkMode(resetSettings.darkMode)
      }
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
      if (hasChanges) {
        const updateResult = await settingsAPI.update(settings)
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to save settings before sending digest')
        }
      }

      const result = await settingsAPI.sendWeeklyDigestNow()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (digestResult) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSettings'] })
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

  const darkModeMutation = useMutation({
    mutationFn: async (isEnabled) => {
      const result = await settingsAPI.update({ darkMode: isEnabled })
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onMutate: async (isEnabled) => {
      await queryClient.cancelQueries({ queryKey: ['dashboardSettings'] })
      const previousSettings = queryClient.getQueryData(['dashboardSettings'])

      queryClient.setQueryData(['dashboardSettings'], (current) =>
        current ? { ...current, darkMode: isEnabled } : current
      )

      return { previousSettings }
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['dashboardSettings'], updatedSettings)
      setSettings(updatedSettings)
      applyDarkMode(updatedSettings.darkMode)
      persistDarkMode(updatedSettings.darkMode)
      setSuccessMessage('Dark mode preference saved.')
      setErrorMessage('')
      setSaved(true)
    },
    onError: (mutationError, _isEnabled, context) => {
      const previousDarkMode = context?.previousSettings?.darkMode
      if (typeof previousDarkMode === 'boolean') {
        applyDarkMode(previousDarkMode)
        persistDarkMode(previousDarkMode)
        setSettings((prev) => ({ ...prev, darkMode: previousDarkMode }))
      }
      if (context?.previousSettings) {
        queryClient.setQueryData(['dashboardSettings'], context.previousSettings)
      }
      setSaved(false)
      setErrorMessage(mutationError.message || 'Failed to update dark mode')
    },
  })

  const isMutating =
    saveMutation.isPending ||
    resetMutation.isPending ||
    digestMutation.isPending ||
    darkModeMutation.isPending

  const updateSetting = (key, value) => {
    setSaved(false)
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleDarkModeToggle = (isEnabled) => {
    setSaved(false)
    applyDarkMode(isEnabled)
    persistDarkMode(isEnabled)
    setSettings((prev) => ({ ...prev, darkMode: isEnabled }))
    darkModeMutation.mutate(isEnabled)
  }

  const handleWeeklyDigestToggle = (isEnabled) => {
    const nextSettings = { ...settings, weeklyDigest: isEnabled }
    setSettings(nextSettings)
    setSaved(false)
    saveMutation.mutate(nextSettings)
  }

  if (isLoading) {
    return <LoadingState />
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
      <PageHeader
        title="Settings"
        description="Configure dashboard preferences and system settings"
      />

      <div className="space-y-6">
        <NotificationSettings
          settings={settings}
          isMutating={isMutating}
          onEmailNotificationsChange={(event) => updateSetting('emailNotifications', event.target.checked)}
          onReportAlertsChange={(event) => updateSetting('reportAlerts', event.target.checked)}
          onWeeklyDigestChange={(event) => handleWeeklyDigestToggle(event.target.checked)}
          onSendDigestNow={() => {
            setSaved(false)
            digestMutation.mutate()
          }}
          digestPending={digestMutation.isPending}
        />

        <AppearanceSettings
          darkMode={settings.darkMode}
          isMutating={isMutating}
          onDarkModeChange={(event) => handleDarkModeToggle(event.target.checked)}
        />

        {isAdmin ? (
          <ModerationSettings
            settings={settings}
            isMutating={isMutating}
            onAutoVerifyChange={(event) => updateSetting('autoVerify', event.target.checked)}
            onMinConfidenceChange={(event) =>
              updateSetting('minConfidenceScore', parseInt(event.target.value, 10))
            }
          />
        ) : null}

        <SystemInfoSection />

        <SettingsActions
          hasChanges={hasChanges}
          isMutating={isMutating}
          savePending={saveMutation.isPending}
          resetPending={resetMutation.isPending}
          onSave={() => {
            setSaved(false)
            saveMutation.mutate(settings)
          }}
          onReset={() => {
            setSaved(false)
            resetMutation.mutate()
          }}
          errorMessage={errorMessage}
          saved={saved}
          successMessage={successMessage}
        />
      </div>
    </div>
  )
}

export default SettingsPage
