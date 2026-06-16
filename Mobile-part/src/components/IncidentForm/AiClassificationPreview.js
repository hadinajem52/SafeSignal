import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, SeverityBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { incidentAPI } from '../../services/api';
import incidentConstants from '../../../../constants/incident';
import haptics from '../../utils/haptics';

const { CATEGORY_DISPLAY } = incidentConstants;
const MIN_TEXT = 10;

const AiClassificationPreview = ({ title, description, onApply }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const text = `${title || ''} ${description || ''}`.trim();
  const canPreview = text.length >= MIN_TEXT && !loading;

  useEffect(() => {
    requestRef.current += 1;
    setResult(null);
    setError(null);
    setLoading(false);
  }, [title, description]);

  const handlePreview = async () => {
    haptics.selection();
    const reqId = (requestRef.current += 1);
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await incidentAPI.previewClassification({ title, description });
    if (reqId !== requestRef.current) return;
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Could not reach the AI right now.');
      return;
    }
    if (!res.available) {
      setError("The AI couldn't tag this yet — it will still classify your report on submit.");
      return;
    }
    setResult(res);
  };

  const category = result?.category ? CATEGORY_DISPLAY[result.category] || CATEGORY_DISPLAY.other : null;
  const confidencePct = result?.confidence != null ? Math.round(result.confidence * 100) : null;

  return (
    <View style={[styles.card, { backgroundColor: `${theme.primary}0D`, borderColor: `${theme.primary}33` }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={15} color={theme.primary} />
        <AppText variant="label" style={[styles.headerText, { color: theme.text }]}>AI tagging</AppText>
      </View>
      <AppText variant="caption" style={[styles.subtitle, { color: theme.textSecondary }]}>
        Category and severity are set automatically on submit. Preview them first if you like.
      </AppText>

      {result ? (
        <>
          <View style={styles.resultRow}>
            {category ? (
              <View style={[styles.categoryChip, { backgroundColor: `${category.mapColor}22` }]}>
                <Ionicons name={category.mapIcon} size={13} color={category.mapColor} />
                <AppText variant="caption" style={{ color: category.mapColor, marginLeft: 4 }}>
                  {category.label}
                </AppText>
              </View>
            ) : null}
            {result.severity ? <SeverityBadge severity={result.severity} /> : null}
            {confidencePct != null ? (
              <AppText variant="small" style={{ color: theme.textTertiary }}>{confidencePct}% sure</AppText>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              haptics.light();
              onApply(result);
            }}
            accessibilityRole="button"
            accessibilityLabel="Use these AI tags"
          >
            <AppText variant="buttonSmall" style={styles.applyText}>Use these tags</AppText>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.previewButton, { borderColor: theme.primary, opacity: canPreview ? 1 : 0.5 }]}
          onPress={handlePreview}
          disabled={!canPreview}
          accessibilityRole="button"
          accessibilityLabel="Preview AI tags"
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="sparkles-outline" size={15} color={theme.primary} />
          )}
          <AppText variant="buttonSmall" style={{ color: theme.primary, marginLeft: 8 }}>
            {loading ? 'Analyzing…' : 'Preview AI tags'}
          </AppText>
        </TouchableOpacity>
      )}

      {error ? (
        <AppText variant="caption" style={[styles.note, { color: theme.textSecondary }]}>{error}</AppText>
      ) : null}
      {!result && !error && text.length < MIN_TEXT ? (
        <AppText variant="small" style={[styles.note, { color: theme.textTertiary }]}>
          Add a title and description to preview.
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerText: {
    letterSpacing: 0.2,
  },
  subtitle: {
    lineHeight: 18,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
  },
  applyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
  },
  applyText: {
    color: '#FFFFFF',
  },
  note: {
    marginTop: 8,
    lineHeight: 17,
  },
});

export default AiClassificationPreview;
