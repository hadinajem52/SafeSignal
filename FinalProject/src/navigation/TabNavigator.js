import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import MapScreen from '../screens/MapScreen';
import AccountScreen from '../screens/AccountScreen';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.fabWrapper}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.fabButton}>
      {children}
    </View>
  </TouchableOpacity>
);

const ReportsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MyReports" 
        component={MyReportsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ReportIncident" 
        component={ReportIncidentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IncidentDetail"
        component={IncidentDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: styles.tabBar
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Reports" component={ReportsStack} />
      
      <Tab.Screen 
        name="SubmitReport" 
        component={ReportIncidentScreen}
        options={{
          tabBarIcon: () => (
            <Ionicons name="add" size={28} color="white" style={styles.fabIcon} />
          ),
            tabBarButton: (props) => (
                <CustomTabBarButton {...props} />
            ),
            tabBarLabel: () => null,
          headerShown: false
        }}
      />

      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingBottom: 10,
    paddingTop: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabWrapper: {
    top: -28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  fabIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
  }
});

export default TabNavigator;
