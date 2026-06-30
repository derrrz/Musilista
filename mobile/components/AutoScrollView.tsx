import { forwardRef, useImperativeHandle, useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

export interface AutoScrollViewRef {
  play: () => void;
  pause: () => void;
  setSpeed: (px: number) => void;
}

interface AutoScrollViewProps extends ScrollViewProps {
  speed?: number;
}

export const AutoScrollView = forwardRef<AutoScrollViewRef, AutoScrollViewProps>(
  function AutoScrollView({ speed = 30, children, ...props }, ref) {
    const scrollRef = useRef<ScrollView>(null);
    const offsetY = useSharedValue(0);
    const isPlaying = useSharedValue(false);
    const currentSpeed = useSharedValue(speed);

    useImperativeHandle(ref, () => ({
      play: () => { isPlaying.value = true; },
      pause: () => { isPlaying.value = false; },
      setSpeed: (px: number) => { currentSpeed.value = px; },
    }));

    useFrameCallback(({ timeSincePreviousFrame }) => {
      'worklet';
      if (!isPlaying.value || !timeSincePreviousFrame) return;
      offsetY.value += (currentSpeed.value * timeSincePreviousFrame) / 1000;
    });

    // Sync shared value to scroll position on JS thread via a setInterval approach
    // We use onScroll to track position from native side
    const lastOffset = useRef(0);

    useFrameCallback(() => {
      'worklet';
      if (!isPlaying.value) return;
    });

    // Simple approach: periodic scroll sync
    const scheduleRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startScrolling = () => {
      if (scheduleRef.current) return;
      scheduleRef.current = setInterval(() => {
        lastOffset.current += currentSpeed.value / 10;
        scrollRef.current?.scrollTo({ y: lastOffset.current, animated: false });
      }, 100);
    };

    const stopScrolling = () => {
      if (scheduleRef.current) {
        clearInterval(scheduleRef.current);
        scheduleRef.current = null;
      }
    };

    useImperativeHandle(ref, () => ({
      play: () => { isPlaying.value = true; startScrolling(); },
      pause: () => { isPlaying.value = false; stopScrolling(); },
      setSpeed: (px: number) => { currentSpeed.value = px; },
    }), []);

    return (
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          lastOffset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        {...props}
      >
        {children}
      </ScrollView>
    );
  },
);
