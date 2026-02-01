import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAgo } from '../utils/dateUtils';

const IncidentDetailModal = ({
  visible,
  incident,
  onClose,
  onCenterMap,
  getMarkerColor,
  getCategoryLabel,
  categoryDisplay,
}) => {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.detailOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.detailContainer}>
        <TouchableOpacity style={styles.detailCloseButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>

        {!incident ? (
          <ActivityIndicator size="small" color="#1976D2" />
        ) : (
          <>
            <View style={styles.detailHeader}>
              <View
                style={[
                  styles.detailCategoryBadge,
                  { backgroundColor: getMarkerColor(incident.category) },
                ]}
              >
                <Ionicons
                  name={categoryDisplay[incident.category]?.mapIcon || 'help-circle'}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.detailCategoryText}>
                  {getCategoryLabel(incident.category)}
                </Text>
              </View>
              <Text style={styles.detailTime}>{formatTimeAgo(incident.createdAt)}</Text>
            </View>

            <Text style={styles.detailTitle}>{incident.title}</Text>

            <View style={styles.detailStatusRow}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.detailStatusText}>
                {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
              </Text>
            </View>

            <View style={styles.detailLocationRow}>
              <Ionicons name="location" size={18} color="#666" />
              <Text style={styles.detailLocationText}>
                {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.centerMapButton}
              onPress={() => onCenterMap(incident)}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.centerMapButtonText}>Center on Map</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  detailCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailCategoryText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  detailTime: {
    fontSize: 12,
    color: '#666',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  detailLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailLocationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  centerMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1976D2',
  },
  centerMapButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default IncidentDetailModal;
