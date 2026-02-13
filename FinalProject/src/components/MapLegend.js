import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from './Modal';
import { useTheme } from '../context/ThemeContext';
import { getMarkerColor } from '../utils/mapCategory';

const MapLegend = ({ visible, onClose, categoryDisplay }) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onClose={onClose}
      overlayStyle={styles.legendOverlay}
      contentStyle={[styles.legendContainer, { backgroundColor: theme.card }]}
    >
      <Text style={[styles.legendTitle, { color: theme.text }]}>Incident Categories</Text>
      {Object.entries(categoryDisplay).map(([key, config]) => (
        <View key={key} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: getMarkerColor(key, categoryDisplay, theme.mapMarkerDefault) },
            ]}
          />
          <Ionicons
            name={config.mapIcon}
            size={18}
            color={getMarkerColor(key, categoryDisplay, theme.mapMarkerDefault)}
          />
          <Text style={[styles.legendText, { color: theme.text }]}>{config.label}</Text>
        </View>
      ))}
    </Modal>
  );
};

const styles = StyleSheet.create({
  legendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  legendContainer: {
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default MapLegend;
