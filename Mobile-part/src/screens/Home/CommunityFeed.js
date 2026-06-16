import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View } from
'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { AppText, EmptyState, EMPTY_ART, PressableScale } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useFeed from '../../hooks/useFeed';
import FeedCard from './FeedCard';
import haptics from '../../utils/haptics';

const FILTERS = [
{ label: 'All', value: null },
{ label: 'Resolved', value: 'resolved_handled' },
{ label: 'Arrest', value: 'arrest_made' },
{ label: 'False Alarm', value: 'false_alarm' },
{ label: 'Filed', value: 'report_filed' }];


const FilterChip = ({ item, active, onPress, theme }) =>
<PressableScale
  style={[
  styles.chip,
  {
    borderColor: active ? theme.primary : theme.border,
    backgroundColor: active ? theme.primary : theme.card
  }]
  }
  onPress={() => {
    haptics.selection();
    onPress(item.value);
  }}>

    <AppText variant="caption" style={{ color: active ? '#fff' : theme.text }}>
      {item.label}
    </AppText>
  </PressableScale>;


const FeedSearchBar = React.memo(({ onChange, theme }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onChange(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value, onChange]);

  return (
    <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Search resolved reports"
        placeholderTextColor={theme.inputPlaceholder}
        style={[styles.searchInput, { color: theme.text }]}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity
          onPress={() => setValue('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const CommunityFeed = ({
  navigation,
  ListHeaderComponent = null,
  contentContainerStyle,
  externalRefreshing = false,
  onExternalRefresh
}) => {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState(null);
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback((next) => setSearch(next), []);

  const filters = {};
  if (activeFilter) filters.closure_outcome = activeFilter;
  if (search) filters.search = search;
  const {
    incidents,
    loading,
    filtering,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore
  } = useFeed(filters);
  const isRefreshing = refreshing || externalRefreshing;

  const handleCardPress = useCallback((incident) => {
    navigation.navigate('IncidentDetail', { incident, source: 'community_feed' });
  }, [navigation]);

  const renderFeedItem = useCallback(({ item }) =>
  <FeedCard incident={item} onPress={handleCardPress} />,
  [handleCardPress]);

  const handleRefresh = useCallback(async () => {
    haptics.light();
    await Promise.all([
    refresh(),
    Promise.resolve(onExternalRefresh?.())]
    );
  }, [onExternalRefresh, refresh]);






  const headerElement = useMemo(() =>
  <>
      {ListHeaderComponent}

      <View style={styles.header}>
        <AppText variant="h3" style={{ color: theme.text }}>
          Community Feed
        </AppText>
      </View>

      <FeedSearchBar onChange={handleSearchChange} theme={theme} />

      <FlatList
      horizontal
      data={FILTERS}
      keyExtractor={(item) => item.label}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      renderItem={({ item }) =>
      <FilterChip
        item={item}
        active={activeFilter === item.value}
        onPress={setActiveFilter}
        theme={theme} />

      }
      style={styles.chipList} />


      {filtering ?
    <View style={styles.filteringBar}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View> :
    null}
    </>,
  [ListHeaderComponent, theme, activeFilter, filtering, handleSearchChange]);

  const renderFooter = () => {
    if (!loadingMore) {
      return <View style={styles.footerSpacing} />;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={theme.primary} />
      </View>);

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
          size={160} />);


    }

    const hasQuery = Boolean(activeFilter || search);
    return (
      <EmptyState
        illustration={hasQuery ? EMPTY_ART.search : EMPTY_ART.feed}
        title={hasQuery ? 'Nothing matches' : 'No community reports yet'}
        message={hasQuery ? 'Try a different search or filter.' : 'Check back later.'}
        size={160} />);


  };

  return (
    <FlashList
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
      showsVerticalScrollIndicator={false} />);


};

const styles = StyleSheet.create({
  wrapper: {


    paddingTop: 20,
    paddingHorizontal: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14
  },
  chipList: {
    marginBottom: 12
  },
  filteringBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 4
  },
  chips: {
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  loadingIndicator: {
    marginTop: 24
  },
  footerLoader: {
    paddingVertical: 12
  },
  footerSpacing: {
    height: 8
  }
});

export default CommunityFeed;