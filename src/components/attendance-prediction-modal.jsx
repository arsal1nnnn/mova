/**
 * Mova Campus — Future Attendance Prediction Modal & Timeline
 *
 * Implements the prediction engine controls and interactive projection view:
 * - As-of date & Future target date (e.g. final examinations).
 * - Target attendance percentage control (default 75%).
 * - Automatic national/state holiday retrieval with custom college holiday support.
 * - Future scheduled class counts per subject calculated from weekly timetable.
 * - Safe bunk allowance, recovery requirements, and interactive miss simulation.
 * - Timeline visualization with holiday indicators.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { holidayService } from '@/services/holiday-service';
import { Borders, Radius, Spacing } from '@/theme';
import {
  addDays,
  buildFutureAttendanceProjections,
} from '@/utils/attendance-prediction';
import { formatAttendancePercentage } from '@/utils/attendance-validators';

export function AttendancePredictionModal({
  visible,
  onClose,
  subjects = [],
  timetable = [],
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultTargetDate = addDays(todayStr, 60);

  const [asOfDate, setAsOfDate] = useState(todayStr);
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [targetPct, setTargetPct] = useState('75');
  const [countryCode, setCountryCode] = useState('IN');
  const [stateRegion, setStateRegion] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Per-subject simulated misses state { [subjectId]: number }
  const [simulatedMisses, setSimulatedMisses] = useState({});

  // Load holidays whenever date range or country changes
  useEffect(() => {
    if (!visible) return;
    let isCancelled = false;

    async function loadHolidays() {
      setIsLoadingHolidays(true);
      try {
        const fetched = await holidayService.getHolidaysForRange(asOfDate, targetDate, {
          countryCode,
        });
        if (!isCancelled) {
          setHolidays(fetched);
        }
      } catch (err) {
        // Fallback already handled inside holidayService
      } finally {
        if (!isCancelled) setIsLoadingHolidays(false);
      }
    }

    loadHolidays();
    return () => {
      isCancelled = true;
    };
  }, [visible, asOfDate, targetDate, countryCode]);

  const handleAddCollegeHoliday = () => {
    if (!newHolidayDate || !newHolidayName) return;
    holidayService.addCollegeHoliday({
      date: newHolidayDate.trim(),
      name: newHolidayName.trim(),
    });
    setHolidays((prev) => [
      ...prev.filter((h) => h.date !== newHolidayDate.trim()),
      { date: newHolidayDate.trim(), name: newHolidayName.trim(), type: 'college' },
    ]);
    setNewHolidayName('');
    setNewHolidayDate('');
    setShowAddHoliday(false);
  };

  const targetPercentageNum = parseInt(targetPct, 10) || 75;

  // Run pure prediction engine
  const projectionResults = buildFutureAttendanceProjections({
    subjects,
    timetable,
    asOfDate,
    targetDate,
    holidays,
    defaultTarget: targetPercentageNum,
  });

  const { projections, timeline, overallProjection } = projectionResults;

  const handleAdjustMiss = (subjectId, delta, maxLimit) => {
    setSimulatedMisses((prev) => {
      const current = prev[subjectId] || 0;
      const next = Math.max(0, Math.min(maxLimit, current + delta));
      return { ...prev, [subjectId]: next };
    });
  };

  return (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: Math.max(insets.bottom, Spacing.lg),
            maxHeight: '92%',
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText variant="displaySm" style={styles.title}>
              Attendance Projection
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              Intelligent semester forecasting & safe bunk planning
            </ThemedText>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <MovaIcon name="x" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Control Panel Card */}
          <ThemedCard style={styles.controlCard}>
            <ThemedText variant="labelSm" color="textPrimary" style={styles.cardHeading}>
              Forecast Parameters
            </ThemedText>

            <View style={styles.controlGrid}>
              <View style={styles.controlItem}>
                <ThemedText variant="caption" color="textSecondary">
                  As-Of Date
                </ThemedText>
                <ThemedTextInput
                  value={asOfDate}
                  onChangeText={setAsOfDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.controlInput}
                />
              </View>

              <View style={styles.controlItem}>
                <ThemedText variant="caption" color="textSecondary">
                  Target Date (Exams)
                </ThemedText>
                <ThemedTextInput
                  value={targetDate}
                  onChangeText={setTargetDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.controlInput}
                />
              </View>

              <View style={styles.controlItem}>
                <ThemedText variant="caption" color="textSecondary">
                  Target %
                </ThemedText>
                <ThemedTextInput
                  value={targetPct}
                  onChangeText={setTargetPct}
                  keyboardType="numeric"
                  style={styles.controlInput}
                />
              </View>
            </View>

            {/* Country & State Selection */}
            <View style={{ marginTop: Spacing.xs, gap: 4 }}>
              <ThemedText variant="caption" color="textSecondary">
                Country & State Calendar:
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
                {[
                  { code: 'IN', label: 'India' },
                  { code: 'US', label: 'United States' },
                  { code: 'GB', label: 'United Kingdom' },
                  { code: 'CA', label: 'Canada' },
                ].map((c) => {
                  const isSelected = countryCode === c.code;
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => setCountryCode(c.code)}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.border,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: Radius.sm,
                          borderWidth: Borders.thin,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{
                          color: isSelected ? theme.primary : theme.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        }}
                      >
                        {c.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 4 }}>
                <ThemedTextInput
                  placeholder="State / Region (e.g. Karnataka, California, London)"
                  value={stateRegion}
                  onChangeText={setStateRegion}
                  style={{ paddingVertical: 4 }}
                />
              </View>
            </View>

            {/* Holiday Summary & Toggle */}
            <View style={styles.holidayRow}>
              <View style={styles.holidayBadge}>
                <MovaIcon name="calendar" size={14} color={theme.primary} />
                <ThemedText variant="caption" style={{ color: theme.primary, fontWeight: '600', marginLeft: 4 }}>
                  {holidays.length} Holidays Excluded ({countryCode}{stateRegion ? ` • ${stateRegion}` : ''})
                </ThemedText>
              </View>

              <Pressable
                onPress={() => setShowAddHoliday(!showAddHoliday)}
                style={styles.addHolidayBtn}
              >
                <MovaIcon name="plus" size={12} color={theme.textSecondary} />
                <ThemedText variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
                  Add College Holiday
                </ThemedText>
              </Pressable>
            </View>

            {/* Add Custom College Holiday Input */}
            {showAddHoliday && (
              <View style={styles.addHolidayBox}>
                <ThemedTextInput
                  placeholder="Holiday Name (e.g. Cultural Fest)"
                  value={newHolidayName}
                  onChangeText={setNewHolidayName}
                  style={{ flex: 1, paddingVertical: 4, marginRight: 6 }}
                />
                <ThemedTextInput
                  placeholder="YYYY-MM-DD"
                  value={newHolidayDate}
                  onChangeText={setNewHolidayDate}
                  style={{ width: 105, paddingVertical: 4, marginRight: 6 }}
                />
                <ThemedButton size="sm" variant="primary" onPress={handleAddCollegeHoliday}>
                  Add
                </ThemedButton>
              </View>
            )}
          </ThemedCard>

          {/* Overall Aggregate Card */}
          {overallProjection && (
            <ThemedCard style={styles.overviewCard}>
              <View style={styles.overviewRow}>
                <View style={styles.overviewMetric}>
                  <ThemedText variant="caption" color="textSecondary">
                    Current
                  </ThemedText>
                  <ThemedText variant="titleMd" style={{ fontWeight: '700' }}>
                    {formatAttendancePercentage(overallProjection.currentPercentage)}
                  </ThemedText>
                </View>

                <MovaIcon name="trending-up" size={20} color={theme.colors.primary} />

                <View style={styles.overviewMetric}>
                  <ThemedText variant="caption" color="textSecondary">
                    Projected (100% Attended)
                  </ThemedText>
                  <ThemedText
                    variant="titleMd"
                    style={{
                      fontWeight: '700',
                      color:
                        overallProjection.projectedPercentageIfAll >= targetPercentageNum
                          ? '#16A34A'
                          : '#DC2626',
                    }}
                  >
                    {formatAttendancePercentage(overallProjection.projectedPercentageIfAll)}
                  </ThemedText>
                </View>

                <View style={styles.overviewMetric}>
                  <ThemedText variant="caption" color="textSecondary">
                    Future Classes
                  </ThemedText>
                  <ThemedText variant="titleMd" style={{ fontWeight: '700' }}>
                    {overallProjection.totalFutureClasses}
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          )}

          {/* Subject Predictions List */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="labelSm" color="textPrimary">
              Subject Forecasts ({projections.length})
            </ThemedText>
            <Pressable
              onPress={() => setShowTimeline(!showTimeline)}
              style={styles.toggleTimelineBtn}
            >
              <MovaIcon name="clock" size={14} color={theme.colors.primary} />
              <ThemedText variant="caption" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 4 }}>
                {showTimeline ? 'Hide Timeline' : 'View Schedule Timeline'}
              </ThemedText>
            </Pressable>
          </View>

          {projections.map((p) => {
            const missCount = simulatedMisses[p.id] || 0;
            const simulatedPct = p.simulateMisses(missCount);
            const isSafe = simulatedPct >= p.targetPercentage;

            return (
              <ThemedCard key={p.id} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="titleSm" style={{ fontWeight: '700' }}>
                      {p.name}
                    </ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Target {p.targetPercentage}% • {p.futureScheduledClasses} classes scheduled before exams
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          p.projectionStatus === 'on_track'
                            ? '#E8F5E9'
                            : p.projectionStatus === 'at_risk'
                              ? '#FFF8E1'
                              : '#FFEBEE',
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        fontWeight: '700',
                        color:
                          p.projectionStatus === 'on_track'
                            ? '#2E7D32'
                            : p.projectionStatus === 'at_risk'
                              ? '#F57F17'
                              : '#C62828',
                      }}
                    >
                      {p.projectionStatus === 'on_track'
                        ? 'Safe'
                        : p.projectionStatus === 'at_risk'
                          ? 'At Risk'
                          : 'Below Target'}
                    </ThemedText>
                  </View>
                </View>

                {/* Numbers Strip */}
                <View style={styles.statsStrip}>
                  <View style={styles.statBox}>
                    <ThemedText variant="caption" color="textSecondary">
                      Current
                    </ThemedText>
                    <ThemedText variant="bodyMd" style={{ fontWeight: '700' }}>
                      {formatAttendancePercentage(p.currentSummary.percentage)}
                    </ThemedText>
                  </View>

                  <View style={styles.statBox}>
                    <ThemedText variant="caption" color="textSecondary">
                      Max Possible
                    </ThemedText>
                    <ThemedText variant="bodyMd" style={{ fontWeight: '700', color: '#16A34A' }}>
                      {formatAttendancePercentage(p.projectedPercentageIfAll)}
                    </ThemedText>
                  </View>

                  <View style={styles.statBox}>
                    <ThemedText variant="caption" color="textSecondary">
                      Safe Bunks
                    </ThemedText>
                    <ThemedText
                      variant="bodyMd"
                      style={{
                        fontWeight: '700',
                        color: p.maxFutureSafeBunks > 0 ? '#16A34A' : theme.colors.textSecondary,
                      }}
                    >
                      +{p.maxFutureSafeBunks} classes
                    </ThemedText>
                  </View>

                  {p.minConsecutiveToRecover > 0 && (
                    <View style={styles.statBox}>
                      <ThemedText variant="caption" color="textSecondary">
                        Need to Recover
                      </ThemedText>
                      <ThemedText variant="bodyMd" style={{ fontWeight: '700', color: '#DC2626' }}>
                        {p.minConsecutiveToRecover} in a row
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Interactive Miss Simulator */}
                {p.futureScheduledClasses > 0 && (
                  <View style={styles.simulatorRow}>
                    <ThemedText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                      If you miss {missCount} {missCount === 1 ? 'class' : 'classes'}:
                    </ThemedText>

                    <View style={styles.stepperWrap}>
                      <Pressable
                        onPress={() => handleAdjustMiss(p.id, -1, p.futureScheduledClasses)}
                        style={styles.stepBtn}
                        disabled={missCount <= 0}
                      >
                        <ThemedText variant="bodySm" style={{ fontWeight: '700' }}>
                          -
                        </ThemedText>
                      </Pressable>
                      <ThemedText variant="caption" style={{ minWidth: 20, textAlign: 'center' }}>
                        {missCount}
                      </ThemedText>
                      <Pressable
                        onPress={() => handleAdjustMiss(p.id, 1, p.futureScheduledClasses)}
                        style={styles.stepBtn}
                        disabled={missCount >= p.futureScheduledClasses}
                      >
                        <ThemedText variant="bodySm" style={{ fontWeight: '700' }}>
                          +
                        </ThemedText>
                      </Pressable>
                    </View>

                    <View
                      style={[
                        styles.simResultBadge,
                        { backgroundColor: isSafe ? '#E8F5E9' : '#FFEBEE' },
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSafe ? '#2E7D32' : '#C62828',
                        }}
                      >
                        {formatAttendancePercentage(simulatedPct)}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </ThemedCard>
            );
          })}

          {/* Timeline Breakdown */}
          {showTimeline && (
            <ThemedCard style={styles.timelineCard}>
              <ThemedText variant="labelSm" color="textPrimary" style={{ marginBottom: Spacing.xs }}>
                Day-by-Day Forecast Schedule ({timeline.length} Days)
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary" style={{ marginBottom: Spacing.sm }}>
                Holidays and off-days have 0 scheduled lectures.
              </ThemedText>

              {timeline
                .filter((t) => t.isHoliday || t.classesCount > 0)
                .slice(0, 40)
                .map((day) => (
                  <View
                    key={day.date}
                    style={[
                      styles.timelineRow,
                      day.isHoliday && { backgroundColor: 'rgba(200, 66, 11, 0.06)' },
                    ]}
                  >
                    <View style={{ width: 90 }}>
                      <ThemedText variant="caption" style={{ fontWeight: '700' }}>
                        {day.date}
                      </ThemedText>
                      <ThemedText variant="caption" color="textSecondary">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.weekday]}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      {day.isHoliday ? (
                        <View style={styles.holidayEventPill}>
                          <MovaIcon name="sparkle" size={12} color="#C8420B" />
                          <ThemedText variant="caption" style={{ color: '#C8420B', fontWeight: '700', marginLeft: 4 }}>
                            Holiday: {day.holidayName}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText variant="caption" color="textPrimary">
                          {day.classes.map((c) => c.subject_name).join(', ')}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ))}
            </ThemedCard>
          )}
        </ScrollView>

        {/* Footer Action */}
        <View style={styles.footer}>
          <ThemedButton variant="primary" onPress={onClose} style={{ flex: 1 }}>
            Done
          </ThemedButton>
        </View>
      </View>
    </View>
  </Modal>
);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontWeight: '700',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scrollArea: {
    marginBottom: Spacing.md,
  },
  controlCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeading: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  controlGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlItem: {
    flex: 1,
  },
  controlInput: {
    marginTop: 2,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  holidayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: Borders.thin,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  holidayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addHolidayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  addHolidayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  overviewCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewMetric: {
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  toggleTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  subjectCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderTopWidth: Borders.thin,
    borderBottomWidth: Borders.thin,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statBox: {
    alignItems: 'center',
  },
  simulatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: Spacing.sm,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  timelineCard: {
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.xs,
    marginBottom: 4,
  },
  holidayEventPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    paddingTop: Spacing.sm,
  },
});
