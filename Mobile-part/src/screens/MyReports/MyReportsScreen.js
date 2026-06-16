import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, ConfirmModal, Skeleton, SwipeableRow } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useMyReports from '../../hooks/useMyReports';
import EmptyReportsState from './EmptyReportsState';
import myReportsStyles from './myReportsStyles';
import ReportItem from './ReportItem';
import StatusFilterBar from './StatusFilterBar';

const MyReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    incidents,
    isLoading,
    isRefreshing,
    selectedFilter,
    setSelectedFilter,
    pagination,
    handleRefresh,
    deleteDraft
  } = useMyReports({ user });

  const [draftModalIncident, setDraftModalIncident] = useState(null);
  const [deleteModalIncident, setDeleteModalIncident] = useState(null);

  const handleIncidentPress = useCallback((incident) => {
    if (incident.isDraft) {
      setDraftModalIncident(incident);
      return;
    }

    navigation.navigate('IncidentDetail', { incident });
  }, [navigation]);

  const handleIncidentLongPress = useCallback((incident) => {
    if (incident.isDraft) {
      setDeleteModalIncident(incident);
    }
  }, []);

  const renderItem = useCallback(({ item }) =>
  <SwipeableRow
    enabled={!!item.isDraft}
    rowGap={12}
    resetKey={item.id}
    onDelete={() => setDeleteModalIncident(item)}>

      <ReportItem
      item={item}
      onPress={handleIncidentPress}
      onLongPress={handleIncidentLongPress} />

    </SwipeableRow>,

  [handleIncidentPress, handleIncidentLongPress]);

  if (isLoading) {
    return (
      <View style={[myReportsStyles.loadingContainer, { backgroundColor: theme.background }]}>
        <Skeleton style={myReportsStyles.skeletonHeader} />
        <Skeleton style={[myReportsStyles.skeletonFilterRow, { borderColor: theme.border }]} />
        {[1, 2, 3].map((item) =>
        <View key={item} style={[myReportsStyles.skeletonCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Skeleton style={myReportsStyles.skeletonLineWide} />
            <Skeleton style={myReportsStyles.skeletonLineMid} />
            <Skeleton style={myReportsStyles.skeletonLineShort} />
          </View>
        )}
      </View>);

  }

  const totalReports = pagination?.total ?? incidents.length;

  return (
    <View style={[myReportsStyles.container, { backgroundColor: theme.background }]}>
      <View style={[myReportsStyles.headerBand, { borderColor: theme.border }]}>
        <LinearGradient
          colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={myReportsStyles.headerBandGradient}>

          <AppText variant="h4" style={[myReportsStyles.headerTitle, { color: theme.text }]}>My reports</AppText>
          <AppText variant="caption" style={[myReportsStyles.headerCount, { color: theme.textSecondary }]}>
            {totalReports} total
          </AppText>
        </LinearGradient>
      </View>

      <StatusFilterBar selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

      <FlashList
        data={incidents}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
        item.id ? item.id.toString() : `${item.createdAt || 'report'}-${item.status || 'status'}-${index}`
        }
        contentContainerStyle={[myReportsStyles.listContainer, { paddingBottom: tabBarHeight + 8 }]}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
        <EmptyReportsState
          selectedFilter={selectedFilter}
          onReportPress={() => navigation.navigate('ReportIncident')} />

        } />
      <ConfirmModal
        visible={!!deleteModalIncident}
        title="Delete Draft"
        message={`Delete "${deleteModalIncident?.title || 'this draft'}"? This cannot be undone.`}
        actions={[
        { text: 'Cancel', style: 'cancel', onPress: () => setDeleteModalIncident(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const d = deleteModalIncident;
            setDeleteModalIncident(null);
            deleteDraft(d);
          }
        }]
        }
        onRequestClose={() => setDeleteModalIncident(null)} />
      <ConfirmModal
        visible={!!draftModalIncident}
        title={draftModalIncident?.title || 'Draft Report'}
        message="This is a draft report. Continue editing?"
        actions={[
        { text: 'Cancel', style: 'cancel', onPress: () => setDraftModalIncident(null) },
        {
          text: 'Continue Editing',
          onPress: () => {
            const d = draftModalIncident;
            setDraftModalIncident(null);
            navigation.navigate('ReportIncident', { draft: d.draftData });
          }
        }]
        }
        onRequestClose={() => setDraftModalIncident(null)} />

    </View>);

};

export default MyReportsScreen;