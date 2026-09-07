import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

const LIT = new Set(['0-0', '2-0', '1-1', '0-2', '2-2']);
const CELLS = [0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => `${x}-${y}`));

/**
 * The GRID-X mark: a 3x3 lattice whose diagonal nodes are lit, so the grid
 * itself spells the X. Drawn with Views so the app needs no SVG runtime.
 */
export function LogoMark({ size = 20 }: { size?: number }): React.JSX.Element {
  const gap = Math.max(1, Math.round(size * 0.12));
  const cell = (size - gap * 2) / 3;

  return (
    <View style={[styles.grid, { width: size, height: size, gap }]}>
      {CELLS.map((key) => (
        <View
          key={key}
          style={{
            width: cell,
            height: cell,
            borderRadius: Math.max(1.5, cell * 0.28),
            backgroundColor: colors.foreground,
            opacity: LIT.has(key) ? 1 : 0.2,
          }}
        />
      ))}
    </View>
  );
}

/** Tile treatment used in headers and the sign-in screen. */
export function LogoTile({ size = 40 }: { size?: number }): React.JSX.Element {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size <= 32 ? radius.input : radius.card },
      ]}
    >
      <LogoMark size={Math.round(size * 0.54)} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
