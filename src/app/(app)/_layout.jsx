/**
 * Mova Authenticated Route Layout
 *
 * Protects authenticated routes by redirecting unauthenticated users to sign-in.
 * Renders the authenticated navigation tree with a floating pill bottom tab bar
 * matching Figma reference:
 * - Rounded 22px pill container (Radius.nav)
 * - Light: #FFFFFF surface, #F0E6DC border, #EA580C active tint
 * - Dark: #1A202E surface, #2C3342 border, #FF7A29 active tint
 * - 5 core destinations: Home, Tasks, Timetable, Attendance, Campus/Profile
 */

import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export default function AppLayout() {
  const { primary, textSecondary, isDark } = useTheme();
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

  const navBg = isDark ? '#1A202E' : '#FFFFFF';
  const navBorder = isDark ? '#2C3342' : '#F0E6DC';
  const inactiveTint = isDark ? '#A5A8B3' : '#8B8179';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: inactiveTint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBarBase,
          {
            backgroundColor: navBg,
            borderColor: navBorder,
          },
          Platform.OS === 'web'
            ? {
                position: 'absolute',
                bottom: 14,
                left: '50%',
                transform: [{ translateX: '-50%' }],
                width: '92%',
                maxWidth: 440,
                borderRadius: Radius.nav,
                borderWidth: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 16,
              }
            : {
                position: 'absolute',
                bottom: Math.max(insets.bottom, 12),
                marginHorizontal: 16,
                borderRadius: Radius.nav,
                borderWidth: 1,
                elevation: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 12,
              },
        ],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MovaIcon name="home" size={20} color={color} />
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
              <MovaIcon name="tasks" size={20} color={color} />
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
              <MovaIcon name="timetable" size={20} color={color} />
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
              <MovaIcon name="attendance" size={20} color={color} />
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
              <MovaIcon name="user" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          href: null,
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
  tabBarBase: {
    height: 62,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 10,
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
    transform: [{ scale: 1.08 }],
  },
});
