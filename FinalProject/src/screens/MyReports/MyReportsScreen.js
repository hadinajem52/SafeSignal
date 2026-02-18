import React from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../../components';
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

  const handleIncidentPress = (incident) => {
    if (incident.isDraft) {
      Alert.alert(incident.title, 'This is a draft report. Continue editing?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue Editing',
          onPress: () => navigation.navigate('ReportIncident', { draft: incident.draftData }),
        },
      ]);
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
    </View>
  );
};

export default MyReportsScreen;
