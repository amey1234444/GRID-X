import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * Bottom sheet. Every write in this app happens in one: a full-screen form
 * would lose the record the operator is looking at, and a centred dialog is
 * unreachable one-handed on a shop floor.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: progress,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={typography.heading}>{title}</Text>
                {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Single-choice picker rendered inside a sheet. */
export function OptionSheet<T extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { value: T; label: string; hint?: string }[];
  value: T | null;
  onSelect: (value: T) => void;
}): React.JSX.Element {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
          >
            <View style={styles.optionText}>
              <Text style={typography.body}>{option.label}</Text>
              {option.hint ? <Text style={typography.caption}>{option.hint}</Text> : null}
            </View>
            {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

/** Field-shaped trigger that opens an OptionSheet. */
export function SelectTrigger({
  placeholder,
  label,
  onPress,
}: {
  placeholder: string;
  label: string | null;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable style={styles.trigger} onPress={onPress}>
      <Text style={[typography.body, !label && { color: colors.subtleForeground }]} numberOfLines={1}>
        {label ?? placeholder}
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  keyboard: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.popover,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
    paddingBottom: spacing.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  optionText: { flex: 1, gap: 2 },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
  },
});
