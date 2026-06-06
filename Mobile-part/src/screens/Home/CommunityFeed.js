import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { AppText, EmptyState, EMPTY_ART, PressableScale } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useFeed from '../../hooks/useFeed';
import FeedCard from './FeedCard';
import haptics from '../../utils/haptics';

const FILTERS = [
  { label: 'All',         value: null              },
  { label: 'Resolved',    value: 'resolved_handled' },
  { label: 'Arrest',      value: 'arrest_made'      },
  { label: 'False Alarm', value: 'false_alarm'      },
  { label: 'Filed',       value: 'report_filed'     },
];

const FilterChip = ({ item, active, onPress, theme }) => (
  <PressableScale
    style={[
      styles.chip,
      {
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary : theme.card,
      },
    ]}
    onPress={() => {
      haptics.selection();
      onPress(item.value);
    }}
  >
    <AppText variant="caption" style={{ color: active ? '#fff' : theme.text }}>
      {item.label}
    </AppText>
  </PressableScale>
);

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
  const isRefreshing = refreshing || externalRefreshing;

  const handleCardPress = useCallback((incident) => {
    navigation.navigate('IncidentDetail', { incident, source: 'community_feed' });
  }, [navigation]);

  const renderFeedItem = useCallback(({ item }) => (
    <FeedCard incident={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  const handleRefresh = useCallback(async () => {
    haptics.light();
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
        <EmptyState
          illustration={EMPTY_ART.errorNetwork}
          title="Connection lost"
          message={error}
          actionLabel="Try again"
          onAction={refresh}
          size={160}
        />
      );
    }

    return (
      <EmptyState
        illustration={activeFilter ? EMPTY_ART.search : EMPTY_ART.feed}
        title={activeFilter ? 'Nothing matches' : 'No community reports yet'}
        message={activeFilter ? 'Try a different filter.' : 'Check back later.'}
        size={160}
      />
    );
  };

  return (
    <FlatList
      data={incidents}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderFeedItem}
      ListHeaderComponent={headerElement}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
      contentContainerStyle={[styles.wrapper, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={11}
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
