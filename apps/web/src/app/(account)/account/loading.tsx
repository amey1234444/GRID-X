import { PageHeaderSkeleton, PanelSkeleton } from '@/components/app/screen-skeleton';

export default function AccountLoading(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton withActions={false} />
      <PanelSkeleton height={180} />
      <PanelSkeleton height={140} />
    </div>
  );
}
