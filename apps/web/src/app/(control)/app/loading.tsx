import { DashboardSkeleton } from '@/components/app/screen-skeleton';

/**
 * Segment-level loading state for GRID-X Control. Every screen under /app
 * streams behind this, so navigation always has an immediate response even
 * when the API is slow.
 */
export default function ControlLoading(): React.JSX.Element {
  return <DashboardSkeleton />;
}
