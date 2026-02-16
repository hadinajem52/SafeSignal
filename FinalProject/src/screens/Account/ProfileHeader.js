import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const ProfileHeader = ({
  avatarUri,
  initials,
  displayName,
  memberSince,
  email,
  onAvatarPress,
  onEditNamePress,
}) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.profileHeader, { backgroundColor: theme.card }]}>
      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppText variant="h4" style={[styles.avatarText, { color: theme.card }]}>{initials}</AppText>
          )}
          <TouchableOpacity
            style={[
              styles.avatarEdit,
              { backgroundColor: theme.info, borderColor: theme.card },
            ]}
            onPress={onAvatarPress}
          >
            <Ionicons name="camera" size={14} color={theme.card} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.usernameRow}>
            <AppText variant="h4" style={[styles.username, { color: theme.text }]}>{displayName}</AppText>
            <TouchableOpacity style={styles.editButton} onPress={onEditNamePress}>
              <Ionicons name="pencil" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <AppText variant="caption" style={[styles.memberSince, { color: theme.textSecondary }]}>Joined {memberSince}</AppText>
          <AppText variant="body" style={[styles.emailValue, { color: theme.text }]}>{email}</AppText>
        </View>
      </View>
    </Card>
  );
};

export default ProfileHeader;
