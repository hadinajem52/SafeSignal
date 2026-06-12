import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { tokenStorage } from '../../services/tokenStorage';
import VideoControls from '../../components/VideoControls';

/**
 * Inline feed video. Shows a tappable poster until played:
 *  - autoplay on  → mounts muted, looping playback for the visible page
 *  - autoplay off → mounts on play-button press (with sound)
 * Tapping the poster plays inline instead of bubbling to the card (open-detail).
 */
export default function FeedVideo({ url, autoplay = false, width, height }) {
  const { theme } = useTheme();
  const resolvedUrl = resolveMediaUrl(url);
  const [token, setToken] = useState(undefined); // undefined = loading, null = none, string = token
  const [activated, setActivated] = useState(false); // user pressed play

  useEffect(() => {
    let alive = true;
    tokenStorage
      .getToken()
      .then((value) => {
        if (alive) setToken(value ?? null);
      })
      .catch(() => {
        if (alive) setToken(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!resolvedUrl) return null;

  const shouldPlay = autoplay || activated;

  if (!shouldPlay) {
    return (
      <Pressable
        style={[styles.poster, { width, height }]}
        onPress={() => setActivated(true)}
        accessibilityRole="button"
        accessibilityLabel="Play video"
      >
        <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.92)" />
      </Pressable>
    );
  }

  if (token === undefined) {
    return (
      <View style={[styles.poster, { width, height, backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <FeedVideoPlayer
      key={resolvedUrl}
      resolvedUrl={resolvedUrl}
      token={token}
      autoplay={autoplay}
      width={width}
      height={height}
    />
  );
}

function FeedVideoPlayer({ resolvedUrl, token, autoplay, width, height }) {
  const videoRef = useRef(null);

  const source = useMemo(
    () =>
      token
        ? { uri: resolvedUrl, headers: { Authorization: `Bearer ${token}` } }
        : resolvedUrl,
    [resolvedUrl, token],
  );

  const player = useVideoPlayer(source, (instance) => {
    instance.loop = autoplay;
    // Feed autoplay is muted; a deliberate play press keeps sound on.
    instance.muted = autoplay;
    instance.timeUpdateEventInterval = 0.5; // drives the custom scrubber
    instance.play();
  });

  return (
    <View style={{ width, height, backgroundColor: '#000' }}>
      <VideoView
        ref={videoRef}
        player={player}
        style={{ width, height }}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        nativeControls={false}
      />
      <VideoControls player={player} videoRef={videoRef} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
});
