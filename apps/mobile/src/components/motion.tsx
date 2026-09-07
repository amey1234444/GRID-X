import { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

import { motion } from '@/theme';

/**
 * Entrance motion, matching the web app's `Reveal`: a short fade with a small
 * upward translate. Driven by the native driver so a long list stays at 60fps
 * on the low-end Android devices partners actually use.
 */
export function Reveal({
  children,
  delay = 0,
  offset = 12,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  style?: ViewStyle;
}): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Staggered entrance for list items. The delay is capped so item 40 does not
 * wait a second and a half to appear.
 */
export function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <Reveal delay={Math.min(index, 8) * 45} style={style}>
      {children}
    </Reveal>
  );
}

/** Cross-fades content when a value changes — used when a filter swaps a list out. */
export function FadeOnChange({
  dependency,
  children,
  style,
}: {
  dependency: unknown;
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0.4);
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.base,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [dependency, opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
