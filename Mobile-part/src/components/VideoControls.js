import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';
import { DURATION } from '../theme/motion';

const AUTO_HIDE_MS = 3000;

const formatTime = (value) => {
  const s = Number.isFinite(value) && value > 0 ? value : 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

/**
 * Custom themed control overlay for an expo-video player (replaces nativeControls).
 * Drop it as a sibling on top of <VideoView/> inside a relative/absolute container.
 *
 *  - Tap the video to toggle the chrome; it auto-hides ~3s into playback and
 *    stays up while paused.
 *  - `compact` (feed): chrome starts hidden, a persistent corner mute stays
 *    visible (so muted autoplay can be unmuted), and the ±10s skips are dropped.
 *
 * The high-frequency `timeUpdate` subscription lives in <Scrubber/>, which is
 * only mounted while the chrome is visible — so an off-screen / hidden feed
 * player isn't re-rendering several times a second.
 */
export default function VideoControls({
  player,
  videoRef,
  compact = false,
  showSkip = !compact,
  showFullscreen = true,
}) {
  const { theme } = useTheme();

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  const duration = player.duration > 0 ? player.duration : 0;
  const ended = !isPlaying && duration > 0 && player.currentTime >= duration - 0.3;

  const [visible, setVisible] = useState(!compact);
  const hideTimer = useRef(null);

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, [clearHide]);

  const reveal = useCallback(() => {
    setVisible(true);
    if (isPlaying) scheduleHide();
    else clearHide();
  }, [isPlaying, scheduleHide, clearHide]);

  // Auto-hide once playback starts; surface (and keep) the chrome when paused.
  useEffect(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      clearHide();
      setVisible(true);
    }
    return clearHide;
  }, [isPlaying, scheduleHide, clearHide]);

  const onTapSurface = useCallback(() => {
    if (visible) {
      setVisible(false);
      clearHide();
    } else {
      reveal();
    }
  }, [visible, reveal, clearHide]);

  const togglePlay = useCallback(() => {
    if (isPlaying) player.pause();
    else if (ended) player.replay();
    else player.play();
    reveal();
  }, [isPlaying, ended, player, reveal]);

  const toggleMute = useCallback(() => {
    player.muted = !player.muted;
    reveal();
  }, [player, reveal]);

  const skip = useCallback(
    (seconds) => {
      player.seekBy(seconds);
      reveal();
    },
    [player, reveal],
  );

  const goFullscreen = useCallback(() => {
    videoRef?.current?.enterFullscreen?.();
  }, [videoRef]);

  const playIcon = isPlaying ? 'pause' : ended ? 'refresh' : 'play';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Tap layer: toggles the chrome. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onTapSurface} />

      {/* Buffering / loading. */}
      {status === 'loading' ? (
        <View style={styles.centerFill} pointerEvents="none">
          <ActivityIndicator color="#fff" size={compact ? 'small' : 'large'} />
        </View>
      ) : null}

      {/* Persistent corner mute for the feed while the chrome is hidden. */}
      {compact && !visible ? (
        <Pressable style={styles.cornerMute} onPress={toggleMute} hitSlop={8}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#fff" />
        </Pressable>
      ) : null}

      {visible ? (
        <Animated.View
          entering={FadeIn.duration(DURATION.micro)}
          exiting={FadeOut.duration(DURATION.micro)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          {/* Center transport (hidden while buffering so it doesn't sit on the spinner). */}
          {status !== 'loading' ? (
            <View style={styles.centerFill} pointerEvents="box-none">
              {showSkip ? (
                <Pressable onPress={() => skip(-10)} hitSlop={10} style={styles.skipBtn}>
                  <MaterialIcons name="replay-10" size={30} color="#fff" />
                </Pressable>
              ) : null}
              <Pressable
                onPress={togglePlay}
                style={[styles.playBtn, compact && styles.playBtnCompact]}
              >
                <Ionicons
                  name={playIcon}
                  size={compact ? 26 : 32}
                  color="#fff"
                  style={playIcon === 'play' ? styles.playGlyph : null}
                />
              </Pressable>
              {showSkip ? (
                <Pressable onPress={() => skip(10)} hitSlop={10} style={styles.skipBtn}>
                  <MaterialIcons name="forward-10" size={30} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Bottom bar. */}
          <View style={styles.bottom} pointerEvents="box-none">
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.barRow} pointerEvents="box-none">
              <Scrubber
                player={player}
                accent={theme.primary}
                onScrubStart={clearHide}
                onScrubEnd={reveal}
              />
              <Pressable onPress={toggleMute} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
              </Pressable>
              {showFullscreen ? (
                <Pressable onPress={goFullscreen} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="expand" size={18} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Time labels + draggable seek bar. Subscribes to `timeUpdate` (which the player
 * only emits when `timeUpdateEventInterval > 0` — set in the player setup), so
 * it re-renders a few times a second. Mounted only while the chrome is visible.
 */
function Scrubber({ player, accent, onScrubStart, onScrubEnd }) {
  const time = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    bufferedPosition: player.bufferedPosition,
  });
  const duration = player.duration > 0 ? player.duration : 0;

  const [trackWidth, setTrackWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);

  const fractionFromX = useCallback(
    (x) => (trackWidth > 0 ? Math.max(0, Math.min(1, x / trackWidth)) : 0),
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          onScrubStart();
          setScrubbing(true);
          setScrubFraction(fractionFromX(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e) => setScrubFraction(fractionFromX(e.nativeEvent.locationX)),
        onPanResponderRelease: (e) => {
          const f = fractionFromX(e.nativeEvent.locationX);
          if (duration > 0) player.currentTime = f * duration;
          setScrubbing(false);
          onScrubEnd();
        },
        onPanResponderTerminate: () => {
          setScrubbing(false);
          onScrubEnd();
        },
      }),
    [fractionFromX, duration, player, onScrubStart, onScrubEnd],
  );

  const liveFraction = duration > 0 ? Math.min(time.currentTime / duration, 1) : 0;
  const fraction = scrubbing ? scrubFraction : liveFraction;
  const buffered = duration > 0 ? Math.min((time.bufferedPosition ?? 0) / duration, 1) : 0;
  const displayTime = scrubbing ? scrubFraction * duration : time.currentTime;

  return (
    <>
      <AppText variant="caption" style={styles.time}>
        {formatTime(displayTime)}
      </AppText>
      <View
        style={styles.scrubHit}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.buffered, { width: `${buffered * 100}%` }]} />
          <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: accent }]} />
        </View>
        <View
          style={[
            styles.thumb,
            { left: `${fraction * 100}%`, backgroundColor: accent, transform: [{ scale: scrubbing ? 1.3 : 1 }] },
          ]}
        />
      </View>
      <AppText variant="caption" style={styles.time}>
        {formatTime(duration)}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  centerFill: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playBtnCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  playGlyph: {
    marginLeft: 3, // optically center the play triangle
  },
  skipBtn: {
    padding: 6,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 8,
  },
  time: {
    color: '#fff',
    minWidth: 36,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scrubHit: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  buffered: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    top: 7,
  },
  iconBtn: {
    padding: 4,
  },
  cornerMute: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
