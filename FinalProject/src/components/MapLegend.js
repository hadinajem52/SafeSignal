import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from './Modal';

const MapLegend = ({ visible, onClose, categoryDisplay }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onClose={onClose}
      overlayStyle={styles.legendOverlay}
      contentStyle={styles.legendContainer}
    >
      <Text style={styles.legendTitle}>Incident Categories</Text>
      {Object.entries(categoryDisplay).map(([key, config]) => (
        <View key={key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: config.mapColor }]} />
          <Ionicons name={config.mapIcon} size={18} color={config.mapColor} />
          <Text style={styles.legendText}>{config.label}</Text>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
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
    color: '#333',
  },
});

export default MapLegend;
