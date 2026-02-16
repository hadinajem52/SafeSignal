import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal as NativeModal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Modal = ({
  visible,
  onClose,
  onRequestClose,
  children,
  animationType = 'fade',
  transparent = true,
  closeOnOverlayPress = true,
  overlayStyle,
  contentStyle,
}) => {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const visibleRef = useRef(visible);
  const handleClose = onClose || onRequestClose || (() => {});

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    let closeAnimation;

    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return () => {
        fadeAnim.stopAnimation();
        slideAnim.stopAnimation();
      };
    }

    closeAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    closeAnimation.start(() => {
      if (!visibleRef.current) {
        setIsMounted(false);
      }
    });

    return () => {
      closeAnimation.stop();
    };
  }, [visible, fadeAnim, slideAnim]);

  if (!isMounted) {
    return null;
  }

  return (
    <NativeModal
      visible={isMounted}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { backgroundColor: theme.overlay, opacity: fadeAnim }, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeOnOverlayPress ? handleClose : undefined} />
        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: theme.shadow,
                transform: [{ translateY: slideAnim }],
              },
              contentStyle,
            ]}
          >
            <View onStartShouldSetResponder={() => true}>{children}</View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
});

export default Modal;
