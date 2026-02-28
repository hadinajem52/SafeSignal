import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';
import { useToast } from '../context/ToastContext';

const getDraftStorageKey = (userId) => `safesignal_incident_draft_${userId}`;

const useDraftManager = ({ userId, onLoadDraft, getDraftPayload }) => {
  const { showToast } = useToast();
  const [hasDraft, setHasDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const onLoadDraftRef = useRef(onLoadDraft);

  useEffect(() => {
    onLoadDraftRef.current = onLoadDraft;
  }, [onLoadDraft]);

  const clearDraft = useCallback(async () => {
    try {
      if (!userId) {
        logger.warn('User ID not available for clearing draft');
        return;
      }

      const draftKey = getDraftStorageKey(userId);
      await Promise.all([
        SecureStore.deleteItemAsync(draftKey),
        AsyncStorage.removeItem(draftKey),
      ]);
      setHasDraft(false);
      setPendingDraft(null);
    } catch (error) {
      logger.error('Error clearing draft:', error);
    }
  }, [userId]);

  const loadDraft = useCallback(async () => {
    try {
      if (!userId) {
        logger.warn('User ID not available for loading draft');
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
          logger.error('Invalid draft data cleared:', parseError);
          return;
        }

        setHasDraft(true);

        // Surface the draft to the consuming component via state so it can
        // render its own confirmation UI instead of an OS alert dialog.
        setPendingDraft(draft);
      }
    } catch (error) {
      logger.error('Error loading draft:', error);
    }
  }, [userId]);

  const confirmDraft = useCallback(() => {
    if (pendingDraft) {
      onLoadDraftRef.current?.(pendingDraft);
      setPendingDraft(null);
    }
  }, [pendingDraft]);

  const discardDraft = useCallback(() => {
    setPendingDraft(null);
    clearDraft();
  }, [clearDraft]);

  const saveDraft = useCallback(
    async (showAlert = true) => {
      setIsSavingDraft(true);

      try {
        if (!userId) {
          showToast('User information not available. Please log in again.', 'error');
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
          showToast('Draft saved. You can continue editing anytime.', 'success');
        }
      } catch (error) {
        logger.error('Error saving draft:', error);
        if (showAlert) {
          showToast('Failed to save draft. Please try again.', 'error');
        }
      } finally {
        setIsSavingDraft(false);
      }
    },
    [getDraftPayload, showToast, userId]
  );

  return {
    hasDraft,
    isSavingDraft,
    draftId,
    setDraftId,
    pendingDraft,
    confirmDraft,
    discardDraft,
    loadDraft,
    saveDraft,
    clearDraft,
  };
};

export default useDraftManager;
