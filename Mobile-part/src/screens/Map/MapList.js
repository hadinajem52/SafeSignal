import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  EmptyState,
  EMPTY_ART,
  PressableScale,
  SeverityBadge } from
'../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';
import mapStyles from './mapStyles';

const IncidentListRow = ({ incident, categoryDisplay, onPress, theme }) => {
  const markerColor = getMarkerColor(incident.category, categoryDisplay, theme.mapMarkerDefault);
  const categoryLabel = getCategoryLabel(incident.category, categoryDisplay);
  const icon = categoryDisplay[incident.category]?.mapIcon || 'help-circle';
  const time = incident.closedAt || incident.createdAt || incident.timestamp;
  const outcome = incident.closureOutcome ? String(incident.closureOutcome).replace(/_/g, ' ') : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${categoryLabel}: ${incident.title}`}
      onPress={() => onPress(incident)}
      style={[mapStyles.listRow, { backgroundColor: theme.card, borderColor: theme.border }]}>

      <View style={[mapStyles.listIconWrap, { backgroundColor: `${markerColor}1A` }]}>
        <Ionicons name={icon} size={18} color={markerColor} />
      </View>

      <View style={mapStyles.listRowBody}>
        <View style={mapStyles.listTopRow}>
          <AppText variant="caption" style={{ color: markerColor, flex: 1 }} numberOfLines={1}>
            {categoryLabel}
          </AppText>
          {incident.severity ? <SeverityBadge severity={incident.severity} /> : null}
        </View>

        <AppText variant="label" style={{ color: theme.text }} numberOfLines={2}>
          {incident.title}
        </AppText>

        <View style={mapStyles.listMetaRow}>
          {incident.locationName ?
          <>
              <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
              <AppText
              variant="small"
              style={[mapStyles.listMetaText, { color: theme.textTertiary }]}
              numberOfLines={1}>

                {incident.locationName}
              </AppText>
            </> :

          <View style={{ flex: 1 }} />
          }
          {time ?
          <AppText variant="small" style={{ color: theme.textTertiary }}>
              {formatTimeAgo(time)}
            </AppText> :
          null}
        </View>

        {outcome ?
        <View style={[mapStyles.listOutcomePill, { backgroundColor: `${theme.success}1A` }]}>
            <Ionicons name="checkmark-circle-outline" size={12} color={theme.success} />
            <AppText variant="small" style={[mapStyles.listOutcomeText, { color: theme.success }]}>
              {outcome}
            </AppText>
          </View> :
        null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
    </PressableScale>);

};

const MapList = ({
  incidents,
  categoryDisplay,
  onSelectIncident,
  refreshing,
  onRefresh,
  contentPaddingTop,
  contentPaddingBottom
}) => {
  const { theme } = useTheme();

  const renderItem = useCallback(
    ({ item }) =>
    <IncidentListRow
      incident={item}
      categoryDisplay={categoryDisplay}
      onPress={onSelectIncident}
      theme={theme} />,

    [categoryDisplay, onSelectIncident, theme]
  );

  return (
    <View style={mapStyles.map}>
      <FlashList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          paddingHorizontal: 14
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
        <EmptyState
          illustration={EMPTY_ART.map}
          title="No incidents to list"
          message="Try a different category or timeframe."
          size={150} />
        } />

    </View>);

};

export default MapList;
