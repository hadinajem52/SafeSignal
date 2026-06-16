import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { incidentAPI } from '../services/api';
import haptics from '../utils/haptics';

export default function IncidentFollowButton({ incidentId }) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [following, setFollowing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!incidentId) return undefined;
    let active = true;
    incidentAPI.getFollowState(incidentId).then((res) => {
      if (active && res.success) {
        setFollowing(res.following);
      }
    });
    return () => {
      active = false;
    };
  }, [incidentId]);

  if (following === null) {
    return null;
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    haptics.selection();
    const res = await incidentAPI.setFollow(incidentId, next);
    setBusy(false);
    if (!res.success) {
      setFollowing(!next);
      showToast(res.error || 'Could not update follow.', 'error');
      return;
    }
    setFollowing(res.following);
    showToast(res.following ? "You'll get updates on this report." : 'Stopped following this report.', 'success');
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={following ? 'Unfollow this incident' : 'Follow this incident'}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Ionicons
        name={following ? 'notifications' : 'notifications-outline'}
        size={22}
        color={following ? theme.primary : theme.text}
      />
    </TouchableOpacity>
  );
}
