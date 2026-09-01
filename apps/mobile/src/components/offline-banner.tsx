import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useConnectivity } from '@/lib/connectivity';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The connection banner.
 *
 * Mounted once above the tab navigator, so a partner who walks into a shed
 * with no signal gets one honest, persistent explanation instead of every
 * screen inventing its own error. It slides rather than pops — a layout jump
 * on a screen someone is mid-tap on is worse than the outage.
 */
export function OfflineBanner(): React.JSX.Element | null {
  const { state, check } = useConnectivity();
  const slide = useRef(new Animated.Value(0)).current;
  const visible = state !== 'online';

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  if (!visible) return null;

  const checking = state === 'checking';

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        },
      ]}
    >
      <View style={styles.banner}>
        {checking ? (
          <ActivityIndicator size="small" color={colors.warning} />
        ) : (
          <Icon name="wifi-off" size={15} color={colors.warning} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{checking ? 'Reconnecting…' : 'No connection to GRID-X'}</Text>
          <Text style={typography.caption} numberOfLines={1}>
            {checking ? 'Checking the server' : 'Showing the last loaded data'}
          </Text>
        </View>

        {checking ? null : (
          <Pressable onPress={() => void check()} hitSlop={8} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.warning}44`,
    backgroundColor: `${colors.warning}14`,
  },
  title: { fontSize: 13, fontWeight: '600', color: colors.warning },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.control,
    backgroundColor: `${colors.warning}22`,
  },
  retryText: { fontSize: 12, fontWeight: '600', color: colors.warning },
});
