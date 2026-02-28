/**
 * ConfirmModal
 *
 * A theme-aware in-app replacement for OS Alert dialogs that require user action.
 * Supports up to 3 action buttons matching the Alert.alert pattern.
 *
 * Usage:
 *   <ConfirmModal
 *     visible={showModal}
 *     title="Delete Account"
 *     message="This action is permanent and cannot be undone."
 *     actions={[
 *       { text: 'Cancel', style: 'cancel', onPress: () => setShowModal(false) },
 *       { text: 'Delete', style: 'destructive', onPress: handleDelete },
 *     ]}
 *     onRequestClose={() => setShowModal(false)}
 *   />
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import AppText from './Text';

const ConfirmModal = ({
  visible,
  title,
  message,
  actions = [],
  onRequestClose,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      onClose={onRequestClose}
      closeOnOverlayPress={false}
      contentStyle={[styles.content, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      {!!title && (
        <AppText variant="h3" style={[styles.title, { color: theme.text }]}>
          {title}
        </AppText>
      )}
      {!!message && (
        <AppText variant="body" style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </AppText>
      )}

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.actions}>
        {actions.map((action, index) => {
          const isDestructive = action.style === 'destructive';
          const isCancel = action.style === 'cancel';
          const isLast = index === actions.length - 1;
          const textColor = isDestructive
            ? '#ef4444'
            : isCancel
              ? theme.textSecondary
              : theme.primary || '#2563eb';

          return (
            <React.Fragment key={action.text}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isDestructive && styles.actionDestructive,
                  !isDestructive && !isCancel && styles.actionPrimary,
                  { borderColor: theme.border },
                ]}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <AppText
                  variant={isCancel ? 'body' : 'label'}
                  style={[styles.actionText, { color: textColor }]}
                >
                  {action.text}
                </AppText>
              </TouchableOpacity>
              {!isLast && <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />}
            </React.Fragment>
          );
        })}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    borderRadius: 16,
    borderWidth: 1,
    width: undefined,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  title: {
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 20,
    fontSize: 17,
    fontFamily: 'SourceSans3_600SemiBold',
  },
  message: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    marginHorizontal: 20,
    lineHeight: 22,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'column',
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionDestructive: {},
  actionPrimary: {},
  actionText: {
    fontSize: 16,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default ConfirmModal;
