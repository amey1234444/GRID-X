import Feather from '@expo/vector-icons/Feather';

import { colors } from '@/theme';

/**
 * One icon set across the whole app.
 *
 * Feather is the closest native match to Lucide, which the web app uses —
 * same 24px grid, same 2px stroke — so the two surfaces read as one product.
 * Everything goes through this wrapper so no screen reaches for a second set.
 */
export type IconName = React.ComponentProps<typeof Feather>['name'];

export function Icon({
  name,
  size = 18,
  color = colors.mutedForeground,
}: {
  name: IconName;
  size?: number;
  color?: string;
}): React.JSX.Element {
  return <Feather name={name} size={size} color={color} />;
}
