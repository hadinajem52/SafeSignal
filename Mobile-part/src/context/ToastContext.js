import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TOAST_DURATION = 3000;
const ERROR_DURATION = 4500;

const TOAST_CONFIG = {
  success: { bg: '#16a34a', icon: 'checkmark-circle' },
  error:   { bg: '#dc2626', icon: 'alert-circle' },
  warning: { bg: '#d97706', icon: 'warning' },
  info:    { bg: '#2563eb', icon: 'information-circle' },
};

const ToastContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration) => {
    const id = Date.now() + Math.random();
    const d = duration ?? (type === 'error' ? ERROR_DURATION : TOAST_DURATION);

    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, d);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback outside provider (e.g. unit tests)
    return { showToast: () => {} };
  }
  return ctx;
};

// ---------------------------------------------------------------------------
// UI – container
// ---------------------------------------------------------------------------
const ToastContainer = ({ toasts, onDismiss }) => {
  const insets = useSafeAreaInsets();

  if (!toasts.length) return null;

  // Sit above tab bar (≈58 px) + safe-area bottom + a small gap
  const bottomOffset = Math.max(insets.bottom, 8) + 66;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// UI – individual toast
// ---------------------------------------------------------------------------
const ToastItem = ({ toast, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const { type, message, id } = toast;
  const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <TouchableOpacity onPress={() => onDismiss(id)} activeOpacity={0.85}>
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: config.bg, opacity, transform: [{ translateY }] },
        ]}
      >
        <Ionicons name={config.icon} size={20} color="#fff" style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    rowGap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SourceSans3_500Medium',
    flex: 1,
    lineHeight: 20,
  },
});
