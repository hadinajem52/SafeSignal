import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, ConfirmModal } from '../../components';
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
  } = useMyReports({ user });

  const [draftModalIncident, setDraftModalIncident] = useState(null);

  const handleIncidentPress = (incident) => {
    if (incident.isDraft) {
      setDraftModalIncident(incident);
      return;
    }

    navigation.navigate('IncidentDetail', { incident });
  };

  if (isLoading) {
    return (
      <View style={[myReportsStyles.loadingContainer, { backgroundColor: theme.background }]}> 
        <View style={[myReportsStyles.skeletonHeader, { backgroundColor: theme.surface2 }]} />
        <View style={[myReportsStyles.skeletonFilterRow, { backgroundColor: theme.card, borderColor: theme.border }]} />
        {[1, 2, 3].map((item) => (
          <View key={item} style={[myReportsStyles.skeletonCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={[myReportsStyles.skeletonLineWide, { backgroundColor: theme.surface2 }]} />
            <View style={[myReportsStyles.skeletonLineMid, { backgroundColor: theme.surface }]} />
            <View style={[myReportsStyles.skeletonLineShort, { backgroundColor: theme.surface }]} />
          </View>
        ))}
      </View>
    );
  }

  const totalReports = pagination?.total ?? incidents.length;

  return (
    <View style={[myReportsStyles.container, { backgroundColor: theme.background }]}> 
      <LinearGradient
        colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[myReportsStyles.headerBand, { borderColor: theme.border }]}
      >
        <AppText variant="h4" style={[myReportsStyles.headerTitle, { color: theme.text }]}>My reports</AppText>
        <AppText variant="caption" style={[myReportsStyles.headerCount, { color: theme.textSecondary }]}> 
          {totalReports} total
        </AppText>
      </LinearGradient>

      <StatusFilterBar selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

      <FlatList
        data={incidents}
        renderItem={({ item }) => <ReportItem item={item} onPress={handleIncidentPress} />}
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
            onReportPress={() => navigation.navigate('ReportIncident')}
          />
        }
      />

      {/* Draft continue confirmation */}
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
            },
          },
        ]}
        onRequestClose={() => setDraftModalIncident(null)}
      />
    </View>
  );
};

export default MyReportsScreen;
