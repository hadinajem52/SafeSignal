import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const getDraftStorageKey = (userId) => `safesignal_incident_draft_${userId}`;

const useDraftManager = ({ userId, onLoadDraft, getDraftPayload }) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const onLoadDraftRef = useRef(onLoadDraft);

  useEffect(() => {
    onLoadDraftRef.current = onLoadDraft;
  }, [onLoadDraft]);

  const clearDraft = useCallback(async () => {
    try {
      if (!userId) {
        console.warn('User ID not available for clearing draft');
        return;
      }

      const draftKey = getDraftStorageKey(userId);
      await Promise.all([
        SecureStore.deleteItemAsync(draftKey),
        AsyncStorage.removeItem(draftKey),
      ]);
      setHasDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [userId]);

  const loadDraft = useCallback(async () => {
    try {
      if (!userId) {
        console.warn('User ID not available for loading draft');
        return;
      }

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
        let draft;
        try {
          draft = JSON.parse(savedDraft);
        } catch (parseError) {
          await Promise.all([
            SecureStore.deleteItemAsync(draftKey),
            AsyncStorage.removeItem(draftKey),
          ]);
          setHasDraft(false);
          console.error('Invalid draft data cleared:', parseError);
          return;
        }

        setHasDraft(true);

        Alert.alert('Draft Found', 'You have an unsaved draft. Would you like to continue editing it?', [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => clearDraft(),
          },
          {
            text: 'Continue',
            onPress: () => onLoadDraftRef.current?.(draft),
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [clearDraft, userId]);

  const saveDraft = useCallback(
    async (showAlert = true) => {
      setIsSavingDraft(true);

      try {
        if (!userId) {
          Alert.alert('Error', 'User information not available. Please log in again.');
          return;
        }

        const draftKey = getDraftStorageKey(userId);
        const payload = getDraftPayload?.();
        const draftData = {
          ...payload,
          savedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(draftKey, JSON.stringify(draftData));
        setHasDraft(true);

        if (showAlert) {
          Alert.alert('Draft Saved', 'Your report has been saved as a draft.');
        }
      } catch (error) {
        console.error('Error saving draft:', error);
        if (showAlert) {
          Alert.alert('Error', 'Failed to save draft. Please try again.');
        }
      } finally {
        setIsSavingDraft(false);
      }
    },
    [getDraftPayload, userId]
  );

  return {
    hasDraft,
    isSavingDraft,
    draftId,
    setDraftId,
    loadDraft,
    saveDraft,
    clearDraft,
  };
};

export default useDraftManager;
