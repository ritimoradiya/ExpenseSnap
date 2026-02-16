import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          height: 60,
          borderRadius: 30,
          backgroundColor: 'rgba(255, 255, 255, 0.60)',  // Much lighter - white with high opacity
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 12,
          shadowColor: '#C8D9F0',
          shadowOffset: {
            width: 0,
            height: 6,
          },
          shadowOpacity: 0.3,
          shadowRadius: 15,
        },
        tabBarActiveTintColor: '#395886',
        tabBarInactiveTintColor: 'rgba(57, 88, 134, 0.5)',
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}>
      
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Transactions Tab - Changed to receipt icon */}
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "receipt" : "receipt-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Budget Tab - NEW! */}
      <Tabs.Screen
        name="budget"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "wallet" : "wallet-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Analytics/Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Chatbot Tab */}
      <Tabs.Screen
        name="chatbot"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Hidden screens - accessible only via buttons/links */}
      <Tabs.Screen name="camera-scan" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="add-expense" options={{ href: null }} />
    </Tabs>
  );
}