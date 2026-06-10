import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppText, FadeInImage } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import FeedVideo from './FeedVideo';

/**
 * Instagram-style media block for a feed card: a single image, or a swipeable
 * carousel (with dots + counter) when several photos/a video are attached.
 * Videos render as a tappable poster — tapping the card opens the detail screen,
 * where the full player lives (avoids many video players inside a scrolling list).
 *
 * `media` = [{ type: 'image' | 'video', url }]
 */
export default function FeedCardMedia({ media, height = 210, autoplay = false }) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const many = media.length > 1;

  const onScroll = (e) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View
      style={[styles.wrap, { height, backgroundColor: theme.surface }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          scrollEnabled={many}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {media.map((item, i) => (
            <View key={`${item.type}-${i}`} style={{ width, height }}>
              {item.type === 'video' ? (
                <FeedVideo
                  url={item.url}
                  autoplay={autoplay && i === index}
                  width={width}
                  height={height}
                />
              ) : (
                <FadeInImage source={{ uri: resolveMediaUrl(item.url) }} style={{ width, height }} resizeMode="cover" />
              )}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {many ? (
        <>
          <View style={styles.counter}>
            <AppText variant="caption" style={styles.counterText}>
              {index + 1}/{media.length}
            </AppText>
          </View>
          <View style={styles.dots}>
            {media.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { opacity: i === index ? 1 : 0.45 }]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  counter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: {
    color: '#fff',
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
    marginHorizontal: 3,
  },
});
