import React from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUtils';

const IncidentVideoPlayer = ({ videoUrl }) => {
  const { theme } = useTheme();
  const resolvedUrl = resolveMediaUrl(videoUrl);

  if (!resolvedUrl) return null;

  return <VideoEvidenceCard resolvedUrl={resolvedUrl} theme={theme} />;
};

const VideoEvidenceCard = ({ resolvedUrl, theme }) => {
  const player = useVideoPlayer(resolvedUrl, (instance) => {
    instance.loop = false;
  });

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <AppText variant="label" style={[styles.title, { color: theme.text }]}>Video Evidence</AppText>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  title: {
    marginBottom: 8,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default IncidentVideoPlayer;
