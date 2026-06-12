import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { tokenStorage } from '../services/tokenStorage';
import VideoControls from './VideoControls';

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
      <View style={[styles.media, styles.loading, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  // key forces a clean remount when the video URL changes.
  return <VideoEvidenceCard key={resolvedUrl} resolvedUrl={resolvedUrl} token={token} />;
};

const VideoEvidenceCard = ({ resolvedUrl, token }) => {
  const videoRef = useRef(null);

  // Stable source for the player's lifetime.
  const source = useMemo(
    () =>
      token
        ? { uri: resolvedUrl, headers: { Authorization: `Bearer ${token}` } }
        : resolvedUrl,
    [resolvedUrl, token],
  );

  // useVideoPlayer owns the player lifecycle and releases it automatically on
  // unmount — avoids the "shared object already released" race that manual
  // createVideoPlayer + release() hits during navigation transitions.
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.25; // drives the custom scrubber
  });

  return (
    <View style={[styles.media, styles.videoWrap]}>
      <VideoView
        ref={videoRef}
        player={player}
        style={styles.video}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        nativeControls={false}
      />
      <VideoControls player={player} videoRef={videoRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  media: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrap: {
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default IncidentVideoPlayer;
