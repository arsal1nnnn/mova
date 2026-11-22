/**
 * Mova Campus — Streak Calendar Strip
 *
 * 7-day visual consistency strip showing active study & attendance days.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCalendarStrip({ currentStreak = 0, longestStreak = 0, hasActivityToday = false, style }) {
  const theme = useTheme();

  const today = new Date();
  const todayDay = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  return (
    <View style={[styles.container, style]}>
      <View style={styles.daysRow}>
        {DAY_INITIALS.map((initial, idx) => {
          const isToday = idx === todayDay;
          const isPast = idx < todayDay;
          // An active day is either today (if active) or within current streak length
          const daysAgo = todayDay - idx;
          const isActive = (isToday && hasActivityToday) || (isPast && daysAgo < currentStreak);

          return (
            <View key={`${initial}-${idx}`} style={styles.dayCol}>
              <ThemedText
                type="caption"
                style={[
                  styles.initial,
                  { color: isToday ? theme.primary : theme.textSecondary },
                  isToday && { fontWeight: '700' },
                ]}
              >
                {initial}
              </ThemedText>

              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? theme.primary
                      : isToday
                      ? theme.primarySubtle
                      : theme.disabled,
                    borderColor: isToday ? theme.primary : 'transparent',
                    borderWidth: isToday ? 1.5 : 0,
                  },
                ]}
              >
                {isActive ? (
                  <MovaIcon name="check" size={10} color="#FFFFFF" />
                ) : isToday ? (
                  <View style={[styles.innerDot, { backgroundColor: theme.primary }]} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  initial: {
    fontSize: 11,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
});
