import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';

const ActiveChip = ({ label, icon, isActive, onPress, iconColor, chipKey, theme }) => {
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isActive, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.surface, theme.primary],
  });

  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary],
  });

  const labelColor = isActive ? '#FFFFFF' : theme.textSecondary;
  const renderedIconColor = isActive ? '#FFFFFF' : iconColor || theme.textSecondary;

  return (
    <Pressable
      key={chipKey}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChipSpacing, pressed ? styles.pressed : null]}
    >
      <Animated.View style={[styles.filterChip, { backgroundColor, borderColor }]}>
        <View style={styles.chipContent}>
          {icon ? <Ionicons name={icon} size={14} color={renderedIconColor} style={styles.filterChipIcon} /> : null}
          <AppText variant="caption" style={[styles.filterChipText, { color: labelColor }]}>
            {label}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const CategoryFilter = ({ categoryDisplay, selectedCategory, onSelectCategory }) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      <ActiveChip
        chipKey="all"
        label="All"
        isActive={!selectedCategory}
        onPress={() => onSelectCategory(null)}
        theme={theme}
      />

      {Object.entries(categoryDisplay).map(([key, config]) => (
        <ActiveChip
          key={key}
          chipKey={key}
          label={config.label}
          icon={config.mapIcon}
          iconColor={config.mapColor}
          isActive={selectedCategory === key}
          onPress={() => onSelectCategory(selectedCategory === key ? null : key)}
          theme={theme}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filterScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipSpacing: {
    marginRight: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    textTransform: 'capitalize',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});

export default CategoryFilter;
