import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from 'react-native';
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
        <ActivityIndicator size="large" color={theme.primary} />
        <AppText variant="body" style={[myReportsStyles.loadingText, { color: theme.textSecondary }]}> 
          Loading your reports...
        </AppText>
      </View>
    );
  }

  return (
    <View style={[myReportsStyles.container, { backgroundColor: theme.background }]}> 
      <StatusFilterBar selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

      <FlatList
        data={incidents}
        renderItem={({ item }) => <ReportItem item={item} onPress={handleIncidentPress} />}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : `${item.createdAt || 'report'}-${item.status || 'status'}-${index}`
        }
        contentContainerStyle={myReportsStyles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
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
