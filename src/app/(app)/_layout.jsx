/**
 * Mova Authenticated Route Layout
 *
 * Protects authenticated routes by redirecting unauthenticated users to sign-in.
 * Renders the authenticated navigation tree with a persistent, refined bottom tab bar
 * for the core destinations: Home, Tasks, Timetable, Attendance.
 */

import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Layout, Radius, Spacing } from '@/theme';

export default function AppLayout() {
  const { primary, textMuted, surfaceElevated, border, isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  // Protect all child routes from unauthenticated access
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: surfaceElevated,
            borderTopColor: border,
            height: Layout.bottomTabHeight + insets.bottom,
            paddingBottom: Math.max(Spacing.xs, insets.bottom),
          },
        ],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="home" size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="tasks" size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="timetable" size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="attendance" size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Campus',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="user" size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    borderTopWidth: Borders.thin,
    paddingTop: 6,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  iconWrapActive: {
    transform: [{ scale: 1.05 }],
  },
});
