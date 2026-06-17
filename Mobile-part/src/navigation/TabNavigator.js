import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions, Easing } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import haptics from '../utils/haptics';


import HomeScreen from '../screens/Home/HomeScreen';
import MyReportsScreen from '../screens/MyReports/MyReportsScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import MapScreen from '../screens/Map/MapScreen';
import AccountScreen from '../screens/Account/AccountScreen';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const SCREEN_WIDTH = Dimensions.get('window').width;





const slideTabTransition = {
  transitionSpec: {
    animation: 'timing',
    config: { duration: 260, easing: Easing.out(Easing.cubic) }
  },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH]
        })
      }]

    }
  })
};

const CustomTabBarButton = ({ children, onPress, theme }) =>
<TouchableOpacity
  style={styles.fabWrapper}
  onPress={onPress}
  activeOpacity={0.9}>

    <View style={[styles.fabButton, {
    backgroundColor: theme.primary,
    borderColor: theme.tabBar
  }]}>
      {children}
    </View>
  </TouchableOpacity>;


const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right'
};

const DashboardStack = () =>
<Stack.Navigator screenOptions={stackScreenOptions}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
  </Stack.Navigator>;


const ReportsStack = () =>
<Stack.Navigator screenOptions={stackScreenOptions}>
    <Stack.Screen name="MyReports" component={MyReportsScreen} />
    <Stack.Screen
    name="ReportIncident"
    component={ReportIncidentScreen}
    options={{ animation: 'slide_from_bottom' }} />

    <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
  </Stack.Navigator>;


const TabNavigator = () => {
  const { theme } = useTheme();

  const renderTabBarBackground = useCallback(
    () =>
    <View style={[styles.tabBarBackground, { backgroundColor: theme.tabBar, borderColor: theme.primary }]} />,
    [theme.tabBar, theme.primary]
  );

  return (
    <Tab.Navigator
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={({ route }) => ({
        ...slideTabTransition,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: renderTabBarBackground
      })}>

      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch((state) => {
              const reportsRoute = state.routes.find((r) => r.name === 'Reports');
              const innerRoutes = reportsRoute?.state?.routes;
              const isDeep = innerRoutes && innerRoutes.length > 1;



              if (!isDeep) {
                return CommonActions.navigate({ name: 'Reports' });
              }


              const routes = state.routes.map((route) =>
              route.name === 'Reports' ?
              { ...route, state: { index: 0, routes: [{ name: 'MyReports' }] } } :
              route
              );
              const index = routes.findIndex((r) => r.name === 'Reports');
              return CommonActions.reset({ ...state, routes, index });
            });
          }
        })} />


      <Tab.Screen
        name="SubmitReport"
        component={ReportIncidentScreen}
        options={{
          tabBarIcon: () =>
          <Ionicons name="add" size={28} color="white" style={styles.fabIcon} />,

          tabBarButton: (props) =>
          <CustomTabBarButton {...props} theme={theme} />,

          tabBarLabel: () => null,
          headerShown: false
        }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ freezeOnBlur: true }} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>);

};

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'absolute',
    paddingBottom: 10,
    paddingTop: 10,
    borderRadius: 24,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 10
      },
      android: {
        elevation: 8
      }
    })
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1
  },
  fabWrapper: {
    top: -28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 8
      },
      android: {
        elevation: 10
      }
    })
  },
  fabIcon: {
    textAlign: 'center',
    textAlignVertical: 'center'
  }
});

export default TabNavigator;