import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/auth';
import { LoginScreen } from '@/screens/login';
import { NotificationsScreen } from '@/screens/common/notifications';
import { ProfileScreen } from '@/screens/common/profile';
import { InspectionDetailScreen } from '@/screens/inspector/inspection-detail';
import { NonConformancesScreen } from '@/screens/inspector/non-conformances';
import { InspectionQueueScreen, InspectorTodayScreen } from '@/screens/inspector/queue';
import { InspectionResultsScreen } from '@/screens/inspector/results';
import { ReworkDetailScreen, ReworkListScreen } from '@/screens/inspector/rework';
import { PartnerInvoicesScreen, PartnerScorecardScreen } from '@/screens/partner/commercials';
import { PartnerHomeScreen } from '@/screens/partner/dashboard';
import { PartnerDrawingsScreen } from '@/screens/partner/drawings';
import { PartnerInspectionsScreen, PartnerReworkScreen } from '@/screens/partner/inspections';
import { PartnerJobDetailScreen } from '@/screens/partner/job-detail';
import { PartnerJobsScreen } from '@/screens/partner/jobs';
import { PartnerMaterialDetailScreen, PartnerMaterialsScreen } from '@/screens/partner/materials';
import { PartnerMoreScreen } from '@/screens/partner/more';
import type { InspectorStackParamList, PartnerStackParamList } from '@/navigation/types';
import { colors } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.borderSubtle,
    primary: colors.primary,
    text: colors.foreground,
  },
};

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.foreground,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

const tabOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderSubtle,
    height: 62,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.mutedForeground,
};

function tabIcon(
  name: keyof typeof Ionicons.glyphMap,
): (props: { color: string; size: number }) => React.JSX.Element {
  const Icon = ({ color, size }: { color: string; size: number }): React.JSX.Element => (
    <Ionicons name={name} size={size - 2} color={color} />
  );
  Icon.displayName = `TabIcon(${name})`;
  return Icon;
}

// ---------------------------------------------------------------- Inspector

const InspectorTab = createBottomTabNavigator<InspectorStackParamList>();

function InspectorTabs(): React.JSX.Element {
  return (
    <InspectorTab.Navigator screenOptions={tabOptions}>
      <InspectorTab.Screen
        name="InspectorToday"
        component={InspectorTodayScreen}
        options={{ title: 'Today', tabBarIcon: tabIcon('today-outline') }}
      />
      <InspectorTab.Screen
        name="InspectionQueue"
        component={InspectionQueueScreen}
        options={{ title: 'Queue', tabBarIcon: tabIcon('list-outline') }}
      />
      <InspectorTab.Screen
        name="NonConformances"
        component={NonConformancesScreen}
        options={{ title: 'Defects', tabBarIcon: tabIcon('warning-outline') }}
      />
      <InspectorTab.Screen
        name="ReworkList"
        component={ReworkListScreen}
        options={{ title: 'Rework', tabBarIcon: tabIcon('repeat-outline') }}
      />
      <InspectorTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </InspectorTab.Navigator>
  );
}

const InspectorStack = createNativeStackNavigator<InspectorStackParamList>();

function InspectorApp(): React.JSX.Element {
  return (
    <InspectorStack.Navigator screenOptions={stackOptions}>
      <InspectorStack.Screen name="InspectorTabs" component={InspectorTabs} options={{ headerShown: false }} />
      <InspectorStack.Screen
        name="InspectionDetail"
        component={InspectionDetailScreen}
        options={({ route }) => ({ title: route.params.inspectionNumber })}
      />
      <InspectorStack.Screen
        name="InspectionResults"
        component={InspectionResultsScreen}
        options={({ route }) => ({ title: `Measurements · ${route.params.inspectionNumber}` })}
      />
      <InspectorStack.Screen
        name="ReworkDetail"
        component={ReworkDetailScreen}
        options={({ route }) => ({ title: route.params.reworkNumber })}
      />
      <InspectorStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
    </InspectorStack.Navigator>
  );
}

// ------------------------------------------------------------------ Partner

const PartnerTab = createBottomTabNavigator<PartnerStackParamList>();

function PartnerTabs(): React.JSX.Element {
  return (
    <PartnerTab.Navigator screenOptions={tabOptions}>
      <PartnerTab.Screen
        name="PartnerHome"
        component={PartnerHomeScreen}
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }}
      />
      <PartnerTab.Screen
        name="PartnerJobs"
        component={PartnerJobsScreen}
        options={{ title: 'Jobs', tabBarIcon: tabIcon('briefcase-outline') }}
      />
      <PartnerTab.Screen
        name="PartnerMaterials"
        component={PartnerMaterialsScreen}
        options={{ title: 'Material', tabBarIcon: tabIcon('cube-outline') }}
      />
      <PartnerTab.Screen
        name="PartnerInspections"
        component={PartnerInspectionsScreen}
        options={{ title: 'Quality', tabBarIcon: tabIcon('shield-checkmark-outline') }}
      />
      <PartnerTab.Screen
        name="PartnerMore"
        component={PartnerMoreScreen}
        options={{ title: 'More', tabBarIcon: tabIcon('ellipsis-horizontal-outline') }}
      />
    </PartnerTab.Navigator>
  );
}

const PartnerStack = createNativeStackNavigator<PartnerStackParamList>();

function PartnerApp(): React.JSX.Element {
  return (
    <PartnerStack.Navigator screenOptions={stackOptions}>
      <PartnerStack.Screen name="PartnerTabs" component={PartnerTabs} options={{ headerShown: false }} />
      <PartnerStack.Screen
        name="PartnerJobDetail"
        component={PartnerJobDetailScreen}
        options={({ route }) => ({ title: route.params.jobNumber })}
      />
      <PartnerStack.Screen
        name="PartnerMaterialDetail"
        component={PartnerMaterialDetailScreen}
        options={({ route }) => ({ title: route.params.challanNumber })}
      />
      <PartnerStack.Screen
        name="PartnerDrawings"
        component={PartnerDrawingsScreen}
        options={{ title: 'Drawings' }}
      />
      <PartnerStack.Screen name="PartnerRework" component={PartnerReworkScreen} options={{ title: 'Rework' }} />
      <PartnerStack.Screen
        name="PartnerInvoices"
        component={PartnerInvoicesScreen}
        options={{ title: 'Payments' }}
      />
      <PartnerStack.Screen
        name="PartnerScorecard"
        component={PartnerScorecardScreen}
        options={{ title: 'Scorecard' }}
      />
      <PartnerStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <PartnerStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
    </PartnerStack.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isPartner = Boolean(user?.partnerId);

  return (
    <NavigationContainer theme={theme}>
      {!user ? <LoginScreen /> : isPartner ? <PartnerApp /> : <InspectorApp />}
    </NavigationContainer>
  );
}

const styles = {
  boot: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.background,
  },
};
