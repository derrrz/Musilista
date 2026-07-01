import { useEffect, useRef } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { motion } from '@/constants/motion';

interface Tab {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function SegmentedTabs({ tabs, active, onChange }: SegmentedTabsProps) {
  const tabWidths = useRef<number[]>([]);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  function updateIndicator(index: number) {
    const x = tabWidths.current.slice(0, index).reduce((s, w) => s + w, 0);
    const w = tabWidths.current[index] ?? 0;
    indicatorX.value = withTiming(x, { duration: motion.base });
    indicatorW.value = withTiming(w, { duration: motion.base });
  }

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === active);
    if (idx >= 0) updateIndicator(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tabs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  function onLayout(e: LayoutChangeEvent, index: number) {
    tabWidths.current[index] = e.nativeEvent.layout.width;
    const idx = tabs.findIndex((t) => t.key === active);
    if (index === idx) updateIndicator(idx);
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => onChange(tab.key)}
          onLayout={(e) => onLayout(e, i)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.label,
              tab.key === active && styles.labelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: colors.raised,
    borderRadius: 6,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: fontWeight.medium as '500',
  },
  labelActive: {
    color: colors.ink,
    fontWeight: fontWeight.semibold as '600',
  },
});
