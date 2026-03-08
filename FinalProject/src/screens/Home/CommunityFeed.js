import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useFeed from '../../hooks/useFeed';
import FeedCard from './FeedCard';

const FILTERS = [
  { label: 'All',         value: null              },
  { label: 'Resolved',    value: 'resolved_handled' },
  { label: 'Arrest',      value: 'arrest_made'      },
  { label: 'False Alarm', value: 'false_alarm'      },
  { label: 'Filed',       value: 'report_filed'     },
];

const FilterChip = ({ item, active, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.chip,
      {
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary : theme.card,
      },
    ]}
    onPress={() => onPress(item.value)}
  >
    <AppText variant="caption" style={{ color: active ? '#fff' : theme.text }}>
      {item.label}
    </AppText>
  </TouchableOpacity>
);

const EMPTY_MESSAGES = {
  default: 'No community reports yet. Check back later.',
  resolved_handled: 'No resolved reports yet. Check back later.',
  arrest_made: 'No arrest reports yet. Check back later.',
  false_alarm: 'No false alarm reports yet. Check back later.',
  report_filed: 'No filed reports yet. Check back later.',
};

const CommunityFeed = ({
  navigation,
  ListHeaderComponent = null,
  contentContainerStyle,
  externalRefreshing = false,
  onExternalRefresh,
}) => {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState(null);

  const filters = activeFilter ? { closure_outcome: activeFilter } : {};
  const {
    incidents,
    loading,
    filtering,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = useFeed(filters);
  const emptyMessage = EMPTY_MESSAGES[activeFilter] || EMPTY_MESSAGES.default;
  const isRefreshing = refreshing || externalRefreshing;

  const handleCardPress = (incident) => {
    navigation.navigate('IncidentDetail', { incident, source: 'community_feed' });
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refresh(),
      Promise.resolve(onExternalRefresh?.()),
    ]);
  }, [onExternalRefresh, refresh]);

  // Use useMemo to produce a React element (not a callback function).
  // Passing a function as ListHeaderComponent causes FlatList to treat each new
  // function reference as a different component type → full unmount+remount of the
  // header (and SafetyScoreCard) every time activeFilter or filtering changes.
  // A React element is reconciled in-place so the dashboard cards are never remounted.
  const headerElement = useMemo(() => (
    <>
      {ListHeaderComponent}

      <View style={styles.header}>
        <AppText variant="h3" style={{ color: theme.text }}>
          Community Feed
        </AppText>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <FilterChip
            item={item}
            active={activeFilter === item.value}
            onPress={setActiveFilter}
            theme={theme}
          />
        )}
        style={styles.chipList}
      />

      {filtering ? (
        <View style={styles.filteringBar}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : null}
    </>
  ), [ListHeaderComponent, theme, activeFilter, filtering]);

  const renderFooter = () => {
    if (!loadingMore) {
      return <View style={styles.footerSpacing} />;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <ActivityIndicator color={theme.primary} style={styles.loadingIndicator} />;
    }

    if (error) {
      return (
        <AppText
          variant="bodySmall"
          style={{ color: theme.error, textAlign: 'center', marginTop: 16 }}
        >
          {error}
        </AppText>
      );
    }

    return (
      <AppText
        variant="bodySmall"
        style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 16 }}
      >
        {emptyMessage}
      </AppText>
    );
  };

  return (
    <FlatList
      data={incidents}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <FeedCard incident={item} onPress={handleCardPress} />}
      ListHeaderComponent={headerElement}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
      contentContainerStyle={[styles.wrapper, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chipList: {
    marginBottom: 12,
  },
  filteringBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  chips: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadingIndicator: {
    marginTop: 24,
  },
  footerLoader: {
    paddingVertical: 12,
  },
  footerSpacing: {
    height: 8,
  },
});

export default CommunityFeed;
