import React from 'react';
import { Modal as NativeModal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Modal = ({
  visible,
  onClose,
  children,
  animationType = 'slide',
  transparent = true,
  closeOnOverlayPress = true,
  overlayStyle,
  contentStyle,
}) => {
  const { theme } = useTheme();

  return (
    <NativeModal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, overlayStyle]}
        activeOpacity={1}
        onPress={closeOnOverlayPress ? onClose : undefined}
      >
        <View
          style={[styles.content, { backgroundColor: theme.card }, contentStyle]}
          onStartShouldSetResponder={() => true}
        >
          {children}
        </View>
      </TouchableOpacity>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 12,
    padding: 16,
  },
});

export default Modal;
