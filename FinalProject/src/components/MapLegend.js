import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from './Modal';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';
import { getMarkerColor } from '../utils/mapCategory';

const MapLegend = ({ visible, onClose, categoryDisplay }) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onClose={onClose}
      contentStyle={[
        styles.legendContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <AppText variant="h5" style={[styles.legendTitle, { color: theme.text }]}>Incident Categories</AppText>
      {Object.entries(categoryDisplay).map(([key, config]) => {
        const markerColor = getMarkerColor(key, categoryDisplay, theme.mapMarkerDefault);
        return (
          <View key={key} style={[styles.legendItem, { borderBottomColor: theme.divider }]}>
            <View style={[styles.legendSwatch, { backgroundColor: `${markerColor}22`, borderColor: `${markerColor}66` }]}>
              <Ionicons name={config.mapIcon} size={16} color={markerColor} />
            </View>
            <AppText variant="body" style={[styles.legendText, { color: theme.text }]}>
              {config.label}
            </AppText>
          </View>
        );
      })}
    </Modal>
  );
};

const styles = StyleSheet.create({
  legendContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    maxWidth: 360,
    alignSelf: 'center',
  },
  legendTitle: {
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  legendSwatch: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  legendText: {
    flex: 1,
  },
});

export default MapLegend;
