import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';
import { VideoView, createVideoPlayer } from 'expo-video';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { tokenStorage } from '../services/tokenStorage';

const IncidentVideoPlayer = ({ videoUrl }) => {
  const { theme } = useTheme();
  const resolvedUrl = resolveMediaUrl(videoUrl);
  // undefined = token not resolved yet; null = resolved, no token; string = token
  const [token, setToken] = useState(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    tokenStorage
      .getToken()
      .then((value) => {
        if (isActive) setToken(value ?? null);
      })
      .catch(() => {
        if (isActive) setToken(null);
      });

    // Defer mounting the native player until the screen push transition settles.
    // Mounting expo-video mid-transition can race native view attachment.
    const task = InteractionManager.runAfterInteractions(() => {
      if (isActive) setReady(true);
    });

    return () => {
      isActive = false;
      task.cancel?.();
    };
  }, []);

  if (!resolvedUrl) return null;

  // Don't mount the player until (a) the auth token is resolved and (b) the
  // screen has settled (see above).
  if (token === undefined || !ready) {
    return (
      <View style={[styles.container, styles.loading, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  // key forces a clean remount when the video URL changes.
  return <VideoEvidenceCard key={resolvedUrl} resolvedUrl={resolvedUrl} theme={theme} token={token} />;
};

const VideoEvidenceCard = ({ resolvedUrl, theme, token }) => {
  // Stable source for the player's lifetime.
  const source = useMemo(
    () =>
      token
        ? { uri: resolvedUrl, headers: { Authorization: `Bearer ${token}` } }
        : resolvedUrl,
    [resolvedUrl, token],
  );

  const player = useMemo(() => {
    const instance = createVideoPlayer(source);
    instance.loop = false;
    return instance;
  }, [source]);

  useEffect(() => {
    return () => {
      player.pause();
      InteractionManager.runAfterInteractions(() => {
        player.release();
      });
    };
  }, [player]);

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <AppText variant="label" style={[styles.title, { color: theme.text }]}>Video Evidence</AppText>
      <VideoView
        player={player}
        style={styles.video}
        fullscreenOptions={{ enable: true }}
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
  loading: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
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
