import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/tokens';
import { TodayScreen } from '../screens/TodayScreen';
import { BacklogScreen } from '../screens/BacklogScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddTaskScreen } from '../screens/AddTaskScreen';
import { FocusTimerScreen } from '../screens/FocusTimerScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { IdeasScreen } from '../screens/IdeasScreen';
import { KanbanScreen } from '../screens/KanbanScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { PlantsScreen } from '../screens/PlantsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { LocationsScreen } from '../screens/LocationsScreen';
import { SideNavPanel, NavigatorBridge, SIDE_NAV_WIDTH, DESKTOP_BREAKPOINT } from './SideNav';

export type RootStackParamList = {
  Main: undefined;
  AddTask: { goalId?: string } | undefined;
  FocusTimer: { taskId: string; taskTitle: string; plannedMinutes: number };
};

export type MainTabParamList = {
  Today: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Kanban: undefined;
  Ideas: undefined;
  Goals: undefined;
  Inventory: undefined;
  Plants: undefined;
  Locations: undefined;
  Settings: undefined;
};

// Route names in tab order — used to drive the side nav without needing runtime capture
const TAB_ROUTE_NAMES = ['Today', 'Calendar', 'Tasks', 'Kanban', 'Ideas', 'Goals', 'Inventory', 'Plants', 'Locations', 'Settings'] as const;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Ref holds the stable navigate fn captured from the Tab navigator's context
  // (Tab.Navigator renders NavigatorBridge as its tabBar, which has Tab nav context)
  const navigateFnRef = React.useRef<(name: string) => void>(() => {});
  const [activeIndex, setActiveIndex] = React.useState(0);

  return (
    // flex-row on desktop: [SideNav 220px | Tab content flex:1]
    // flex-col on mobile:  [Tab content flex:1 | BottomTabBar]
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>

      {isDesktop && (
        <SideNavPanel
          routeNames={TAB_ROUTE_NAMES as unknown as string[]}
          activeIndex={activeIndex}
          onNavigate={(name) => navigateFnRef.current(name)}
        />
      )}

      <View style={{ flex: 1 }}>
        <Tab.Navigator
          tabBar={(props) => (
            <NavigatorBridge
              {...props}
              isDesktop={isDesktop}
              onIndexChange={setActiveIndex}
              onNavReady={(fn) => { navigateFnRef.current = fn; }}
            />
          )}
          screenOptions={{
            headerShown: false,
            // Mobile bottom bar styling (ignored on desktop since NavigatorBridge returns null)
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
            },
            tabBarActiveTintColor: colors.primaryDark,
            tabBarInactiveTintColor: colors.textMuted,
          }}
        >
          <Tab.Screen name="Today"     component={TodayScreen} />
          <Tab.Screen name="Calendar"  component={CalendarScreen} />
          <Tab.Screen name="Tasks"     component={BacklogScreen}  options={{ tabBarLabel: 'All Tasks' }} />
          <Tab.Screen name="Kanban"    component={KanbanScreen} />
          <Tab.Screen name="Ideas"     component={IdeasScreen} />
          <Tab.Screen name="Goals"     component={GoalsScreen} />
          <Tab.Screen name="Inventory" component={InventoryScreen} />
          <Tab.Screen name="Plants"    component={PlantsScreen} />
          <Tab.Screen name="Locations" component={LocationsScreen} />
          <Tab.Screen name="Settings"  component={SettingsScreen} />
        </Tab.Navigator>
      </View>

    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddTask"
          component={AddTaskScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="FocusTimer"
          component={FocusTimerScreen}
          options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
