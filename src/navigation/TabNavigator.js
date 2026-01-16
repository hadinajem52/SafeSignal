import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import MapScreen from '../screens/MapScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow
    }}
    onPress={onPress}
  >
    <View
      style={{
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#d32f2f',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
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
        options={{ title: 'Report Incident' }}
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
        tabBarStyle: {
            height: 60,
            paddingBottom: 5,
        }
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Reports" component={ReportsStack} />
      
      <Tab.Screen 
        name="SubmitReport" 
        component={ReportIncidentScreen}
        options={{
            tabBarIcon: ({ focused }) => (
                <Ionicons name="add" size={40} color="white" />
            ),
            tabBarButton: (props) => (
                <CustomTabBarButton {...props} />
            ),
            tabBarLabel: () => null,
            headerShown: true,
            title: 'Report Incident'
        }}
      />

      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#7F5DF0',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  }
});

export default TabNavigator;
