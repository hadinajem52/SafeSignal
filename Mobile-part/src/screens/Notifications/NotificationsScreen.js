import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, EmptyState, EMPTY_ART, PressableScale } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useNotifications from '../../hooks/useNotifications';
import haptics from '../../utils/haptics';
import { formatTimeAgo } from '../../utils/dateUtils';
import { DURATION, stagger } from '../../theme/motion';
import styles from './notificationStyles';

const ICON_BY_EVENT = {
  'notification:report_alert': 'alert-circle',
  'notification:report_update': 'document-text',
  'notification:weekly_digest': 'stats-chart',
  'notification:email': 'mail',
};

const getVisual = (eventName, theme) => {
  if (eventName === 'notification:report_alert') {
    return { icon: ICON_BY_EVENT[eventName], tint: theme.error };
  }
  return { icon: ICON_BY_EVENT[eventName] || 'notifications', tint: theme.primary };
};

const TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: 'Alerts', value: 'notification:report_alert' },
  { label: 'Updates', value: 'notification:report_update' },
  { label: 'Digest', value: 'notification:weekly_digest' },
];

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const groupByDate = (items) => {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 7);
  const last30Start = new Date(todayStart);
  last30Start.setDate(last30Start.getDate() - 30);

  const buckets = { today: [], yesterday: [], last7: [], last30: [], older: [] };

  items.forEach((item) => {
    const time = new Date(item.timestamp);
    if (time >= todayStart) buckets.today.push(item);
    else if (time >= yesterdayStart) buckets.yesterday.push(item);
    else if (time >= last7Start) buckets.last7.push(item);
    else if (time >= last30Start) buckets.last30.push(item);
    else buckets.older.push(item);
  });

  return [
    { key: 'today', title: 'Today', data: buckets.today },
    { key: 'yesterday', title: 'Yesterday', data: buckets.yesterday },
    { key: 'last7', title: 'Last 7 days', data: buckets.last7 },
    { key: 'last30', title: 'Last 30 days', data: buckets.last30 },
    { key: 'older', title: 'Earlier', data: buckets.older },
  ].filter((section) => section.data.length > 0);
};

const FilterChip = ({ label, active, onPress, theme }) => (
  <PressableScale
    accessibilityRole="button"
    onPress={onPress}
    style={[
      styles.filterChip,
      { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.card },
    ]}
  >
    <AppText variant="caption" style={{ color: active ? '#fff' : theme.text }}>
      {label}
    </AppText>
  </PressableScale>
);

const NotificationItem = React.memo(({ item, index, theme, onPress, onRemove }) => {
  const { icon, tint } = getVisual(item.eventName, theme);
  return (
    <Animated.View entering={FadeInDown.duration(DURATION.base).delay(stagger(index))}>
      <View
        style={[
          styles.card,
          {
            borderColor: item.read ? theme.border : `${theme.primary}55`,
            backgroundColor: item.read ? theme.surface : `${theme.primary}0D`,
          },
        ]}
      >
        <PressableScale style={styles.cardContent} onPress={() => onPress(item)} accessibilityRole="button">
          <View style={[styles.iconWrap, { backgroundColor: `${tint}1F` }]}>
            <Ionicons name={icon} size={20} color={tint} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <AppText variant="label" numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
                {item.title}
              </AppText>
              {!item.read ? <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} /> : null}
            </View>
            {item.body ? (
              <AppText variant="bodySmall" style={[styles.cardMessage, { color: theme.textSecondary }]}>
                {item.body}
              </AppText>
            ) : null}
            <AppText variant="caption" style={[styles.cardTime, { color: theme.textSecondary }]}>
              {formatTimeAgo(item.timestamp)}
            </AppText>
          </View>
        </PressableScale>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => onRemove(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    remove,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState(null);

  const filteredNotifications = useMemo(
    () => (activeType ? notifications.filter((item) => item.eventName === activeType) : notifications),
    [notifications, activeType],
  );

  const sections = groupByDate(filteredNotifications);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handlePress = useCallback(
    (item) => {
      markRead(item.id);
      if (item.incidentId) {
        navigation.navigate('IncidentDetail', {
          incident: { incident_id: item.incidentId },
          source: 'notification',
        });
      }
    },
    [markRead, navigation],
  );

  const handleRemove = useCallback(
    (id) => {
      haptics.light();
      remove(id);
    },
    [remove],
  );

  const handleMarkAllRead = useCallback(() => {
    haptics.selection();
    markAllRead();
  }, [markAllRead]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <NotificationItem
        item={item}
        index={index}
        theme={theme}
        onPress={handlePress}
        onRemove={handleRemove}
      />
    ),
    [theme, handlePress, handleRemove],
  );

  const renderSectionHeader = useCallback(
    ({ section }) => (
      <AppText variant="h5" style={[styles.sectionHeader, { color: theme.text }]}>
        {section.title}
      </AppText>
    ),
    [theme],
  );

  return (
    <View style={[styles.screenWrapper, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText variant="h4" style={[styles.headerTitle, { color: theme.text }]}>Notifications</AppText>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.headerAction} onPress={handleMarkAllRead}>
            <AppText variant="label" style={{ color: theme.primary }}>Mark all read</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {!loading && notifications.length > 0 ? (
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.label}
              label={filter.label}
              active={activeType === filter.value}
              onPress={() => {
                haptics.selection();
                setActiveType(filter.value);
              }}
              theme={theme}
            />
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.emptyWrapper,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              illustration={EMPTY_ART.notifications}
              title={activeType ? 'Nothing here' : 'No notifications yet'}
              message={
                activeType
                  ? 'No notifications match this filter.'
                  : 'Alerts about your reports and nearby activity will show up here.'
              }
            />
          }
        />
      )}
    </View>
  );
};

export default NotificationsScreen;
