import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const STATUS_LABELS = {
  granted: 'Allowed',
  denied: 'Blocked',
  undetermined: 'Not requested',
  enabled: 'Enabled',
  disabled: 'Disabled',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
};

const getStatusColor = (theme, status) => {
  if (status === 'granted' || status === 'enabled') return theme.success;
  if (status === 'denied' || status === 'disabled') return theme.error;
  return theme.warning;
};

const AccessStatusSection = ({ accessStatus, onOpenSettings }) => {
  const { theme } = useTheme();

  const rows = [
    {
      key: 'location',
      label: 'Location',
      icon: 'location-outline',
      value: accessStatus.location,
      hint: 'Used for nearby safety scoring and map context',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      value: accessStatus.notifications,
      hint: 'Used for incident updates and alerts',
    },
    {
      key: 'camera',
      label: 'Camera',
      icon: 'camera-outline',
      value: accessStatus.camera,
      hint: 'Used to capture report photos',
    },
    {
      key: 'photos',
      label: 'Photos',
      icon: 'images-outline',
      value: accessStatus.photos,
      hint: 'Used to attach media from your library',
    },
  ];

  return (
    <Card
      style={[
        styles.settingsContainer,
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Access Status</AppText>

      {rows.map((row) => {
        const status = row.value?.status || 'unknown';
        const statusColor = getStatusColor(theme, status);
        const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.unknown;

        return (
          <View key={row.key} style={[styles.accessStatusRow, { borderBottomColor: theme.divider }]}> 
            <View style={styles.accessStatusLeft}>
              <View style={[styles.accessStatusIconWrap, { backgroundColor: `${statusColor}18` }]}> 
                <Ionicons name={row.icon} size={16} color={statusColor} />
              </View>
              <View style={styles.settingInfo}>
                <AppText variant="label" style={[styles.accessStatusLabel, { color: theme.text }]}>{row.label}</AppText>
                <AppText variant="small" style={[styles.accessStatusHint, { color: theme.textSecondary }]}>
                  {row.value?.detail || row.hint}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" style={[styles.accessStatusValue, { color: statusColor }]}> 
              {statusLabel}
            </AppText>
          </View>
        );
      })}

      <TouchableOpacity style={styles.accessStatusFooter} onPress={onOpenSettings}>
        <AppText variant="label" style={{ color: theme.primary }}>Open Device Settings</AppText>
      </TouchableOpacity>
    </Card>
  );
};

export default AccessStatusSection;
