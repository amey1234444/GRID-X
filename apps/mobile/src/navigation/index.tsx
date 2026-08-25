import { ActivityIndicator, Text, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/context/auth';
import { LoginScreen } from '@/screens/login';
import {
  InspectionDetailScreen,
  InspectionQueueScreen,
  ReworkScreen,
  type InspectorStackParamList,
} from '@/screens/inspector';
import {
  PartnerHomeScreen,
  PartnerInvoicesScreen,
  PartnerJobDetailScreen,
  PartnerJobsScreen,
  type PartnerStackParamList,
} from '@/screens/partner';
import { ProfileScreen } from '@/screens/shared';
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

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.foreground,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

const tabOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderSubtle,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.mutedForeground,
};

function TabGlyph({ glyph, color }: { glyph: string; color: string }): React.JSX.Element {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

const InspectorStack = createNativeStackNavigator<InspectorStackParamList>();

function InspectorQueueStack(): React.JSX.Element {
  return (
    <InspectorStack.Navigator screenOptions={screenOptions}>
      <InspectorStack.Screen
        name="InspectionQueue"
        component={InspectionQueueScreen}
        options={{ headerShown: false }}
      />
      <InspectorStack.Screen
        name="InspectionDetail"
        component={InspectionDetailScreen}
        options={({ route }) => ({ title: route.params.inspectionNumber })}
      />
    </InspectorStack.Navigator>
  );
}

const InspectorTabs = createBottomTabNavigator();

function InspectorApp(): React.JSX.Element {
  return (
    <InspectorTabs.Navigator screenOptions={tabOptions}>
      <InspectorTabs.Screen
        name="Queue"
        component={InspectorQueueStack}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="☰" color={color} /> }}
      />
      <InspectorTabs.Screen
        name="Rework"
        component={ReworkScreen}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="↺" color={color} /> }}
      />
      <InspectorTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="◉" color={color} /> }}
      />
    </InspectorTabs.Navigator>
  );
}

const PartnerStack = createNativeStackNavigator<PartnerStackParamList>();

function PartnerJobsStack(): React.JSX.Element {
  return (
    <PartnerStack.Navigator screenOptions={screenOptions}>
      <PartnerStack.Screen name="PartnerJobs" component={PartnerJobsScreen} options={{ headerShown: false }} />
      <PartnerStack.Screen
        name="PartnerJobDetail"
        component={PartnerJobDetailScreen}
        options={({ route }) => ({ title: route.params.jobNumber })}
      />
    </PartnerStack.Navigator>
  );
}

const PartnerTabs = createBottomTabNavigator();

function PartnerApp(): React.JSX.Element {
  return (
    <PartnerTabs.Navigator screenOptions={tabOptions}>
      <PartnerTabs.Screen
        name="Home"
        component={PartnerHomeScreen}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="⌂" color={color} /> }}
      />
      <PartnerTabs.Screen
        name="Jobs"
        component={PartnerJobsStack}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="☰" color={color} /> }}
      />
      <PartnerTabs.Screen
        name="Invoices"
        component={PartnerInvoicesScreen}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="₹" color={color} /> }}
      />
      <PartnerTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <TabGlyph glyph="◉" color={color} /> }}
      />
    </PartnerTabs.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
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
