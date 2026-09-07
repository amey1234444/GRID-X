import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { AuthProvider } from '@/context/auth';
import { ConnectivityProvider } from '@/lib/connectivity';
import { RootNavigator } from '@/navigation';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ConnectivityProvider>
        <AuthProvider>
          <StatusBar style="light" />
          {/* Above the navigator, so one honest explanation covers every screen. */}
          <OfflineBanner />
          <RootNavigator />
        </AuthProvider>
      </ConnectivityProvider>
    </SafeAreaProvider>
  );
}
