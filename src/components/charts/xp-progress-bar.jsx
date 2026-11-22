/**
 * Mova Campus — XP & Level Progress Bar
 *
 * Displays the student's current RPG rank, level number, accumulated points,
 * and next level progress.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { calculateLevelFromXp } from '@/services/reward-service';
import { Borders, Radius, Spacing } from '@/theme';

export function XpProgressBar({ totalPoints = 0, totalXp = 0, style }) {
  const theme = useTheme();
  const levelInfo = calculateLevelFromXp(totalXp);

  return (
    <ThemedCard variant="outlined" style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={styles.badgeWrap}>
          <View style={[styles.levelCircle, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.levelNumber}>{levelInfo.level}</ThemedText>
          </View>
          <View style={{ marginLeft: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText type="bodyStrong" style={{ fontWeight: '700' }}>
                {levelInfo.title}
              </ThemedText>
              <View style={[styles.levelPill, { backgroundColor: theme.primarySubtle }]}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700', fontSize: 10 }}>
                  LVL {levelInfo.level}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="caption" color="textSecondary">
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP to next level
            </ThemedText>
          </View>
        </View>

        <View style={styles.pointsWrap}>
          <MovaIcon name="sparkle" size={14} color={theme.xp} />
          <ThemedText type="bodyStrong" style={{ fontWeight: '700', marginLeft: 4, color: theme.text }}>
            {totalPoints}
          </ThemedText>
          <ThemedText type="caption" color="textSecondary" style={{ marginLeft: 2 }}>
            pts
          </ThemedText>
        </View>
      </View>

      {/* Progress track */}
      <View style={[styles.track, { backgroundColor: theme.disabled }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, Math.max(3, Math.round(levelInfo.progress * 100)))}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    marginLeft: 6,
  },
  pointsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: '#FAF7F2',
  },
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
