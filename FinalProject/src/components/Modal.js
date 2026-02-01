import React from 'react';
import { Modal as NativeModal, StyleSheet, TouchableOpacity, View } from 'react-native';

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
          style={[styles.content, contentStyle]}
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
});

export default Modal;
