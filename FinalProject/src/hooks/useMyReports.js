import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { incidentAPI } from '../services/api';

const getDraftStorageKey = (userId) => `safesignal_incident_draft_${userId}`;

const useMyReports = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [pagination, setPagination] = useState(null);

  const fetchIncidents = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      let incidentsFromApi = [];
      let paginationData = null;

      if (selectedFilter !== 'draft') {
        const params = selectedFilter !== 'all' ? { status: selectedFilter } : {};
        const result = await incidentAPI.getMyIncidents(params);

        if (result.success) {
          incidentsFromApi = result.incidents;
          paginationData = result.pagination;
        } else {
          Alert.alert('Error', result.error || 'Failed to load incidents');
        }
      }

      let draftItem = null;
      if (selectedFilter === 'all' || selectedFilter === 'draft') {
        try {
          if (user?.user_id || user?.userId) {
            const userId = user.user_id || user.userId;
            const draftKey = getDraftStorageKey(userId);
            let savedDraft = await SecureStore.getItemAsync(draftKey);
            if (!savedDraft) {
              const legacyDraft = await AsyncStorage.getItem(draftKey);
              if (legacyDraft) {
                savedDraft = legacyDraft;
                await SecureStore.setItemAsync(draftKey, legacyDraft);
                await AsyncStorage.removeItem(draftKey);
              }
            }

            if (savedDraft) {
              const draft = JSON.parse(savedDraft);
              draftItem = {
                id: `draft-${draft.savedAt || Date.now()}`,
                title: draft.title || 'Untitled Draft',
                description: draft.description || 'No description yet.',
                category: draft.category || 'other',
                location: draft.location || null,
                locationName: draft.locationName || '',
                createdAt: draft.savedAt || draft.incidentDate || new Date().toISOString(),
                status: 'draft',
                isDraft: true,
                draftData: draft,
              };
            }
          }
        } catch (draftError) {
          console.error('Error loading draft:', draftError);
        }
      }

      const mergedIncidents = draftItem
        ? [draftItem, ...incidentsFromApi]
        : incidentsFromApi;

      if (paginationData && draftItem && selectedFilter === 'all') {
        paginationData = {
          ...paginationData,
          total: paginationData.total + 1,
        };
      }

      setIncidents(mergedIncidents);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter, user]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchIncidents(false);
  }, [fetchIncidents]);

  return {
    incidents,
    isLoading,
    isRefreshing,
    selectedFilter,
    setSelectedFilter,
    pagination,
    handleRefresh,
  };
};

export default useMyReports;
