/**
 * Mova Campus — Attendance History Modal
 *
 * Shows date-grouped attendance records for a single subject.
 * Allows toggling status and deleting individual records.
 */

import React, { useState } from 'react';
import {
  Modal,
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
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatAttendancePercentage,
  getAttendanceStatusLabel,
  groupRecordsByDate,
} from '@/utils/attendance-validators';

function getLocalDateISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const today = getLocalDateISO();
    if (dateStr === today) return 'Today';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

function HistoryContent({ subject, records, onToggle, onDeleteRecord, onAddRecord, onClose }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const summary = subject?.summary;
  const grouped = groupRecordsByDate(records);

  const [inputDate, setInputDate] = useState(getLocalDateISO());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState(null);

  const handleAdd = async (status) => {
    if (!inputDate || !inputDate.trim()) {
      setDateError('Please enter a date.');
      return;
    }
    setDateError(null);
    setIsSubmitting(true);
    try {
      await onAddRecord?.(subject.id, inputDate.trim(), status);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.backdrop,
        { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(31,27,22,0.44)' },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close history"
        style={styles.dismissOverlay}
        onPress={onClose}
      />

      <ThemedCard
        variant="elevated"
        style={[
          styles.modalCard,
          { paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.md) },
        ]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" numberOfLines={2}>{subject?.name}</ThemedText>
            {summary && summary.totalClasses > 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {formatAttendancePercentage(summary.percentage, summary.totalClasses)} · {getAttendanceStatusLabel(summary.status)} · Target {subject.target_percentage}%
              </ThemedText>
            ) : (
              <ThemedText type="caption" themeColor="textMuted">
                No classes recorded · Target {subject?.target_percentage || 75}%
              </ThemedText>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={4}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}>
            <ThemedText type="bodyStrong" style={{ color: theme.textSecondary }}>
              ✕
            </ThemedText>
          </Pressable>
        </View>

        {/* Add Record for Date Box */}
        {onAddRecord && (
          <View style={[styles.addBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="caption" style={{ fontWeight: '700', marginBottom: 4 }}>
              Log Class for Date
            </ThemedText>
            <View style={styles.dateInputRow}>
              <View style={{ flex: 1 }}>
                <ThemedTextInput
                  value={inputDate}
                  onChangeText={(val) => {
                    setInputDate(val);
                    if (dateError) setDateError(null);
                  }}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  error={dateError}
                />
              </View>
              <View style={styles.quickDateCol}>
                <Pressable
                  onPress={() => setInputDate(getLocalDateISO())}
                  style={[styles.smallDateBtn, { borderColor: theme.border }]}>
                  <ThemedText type="caption" themeColor="textSecondary">Today</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setInputDate(getLocalDateISO(y));
                  }}
                  style={[styles.smallDateBtn, { borderColor: theme.border }]}>
                  <ThemedText type="caption" themeColor="textSecondary">Yesterday</ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={styles.addButtonsRow}>
              <ThemedButton
                title="Mark Present"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onPress={() => handleAdd('present')}
                leftIcon={<MovaIcon name="check" size={13} color={theme.primaryText} strokeWidth={2.4} />}
                style={{ flex: 1 }}
              />
              <ThemedButton
                title="Mark Absent"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onPress={() => handleAdd('absent')}
                leftIcon={<MovaIcon name="x" size={13} color={theme.primary} strokeWidth={2.2} />}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
          {grouped.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ThemedText type="bodySmall" themeColor="textMuted" style={{ textAlign: 'center' }}>
                No attendance records yet.{'\n'}Mark present or absent to start tracking.
              </ThemedText>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.date} style={styles.dateGroup}>
                <ThemedText type="label" themeColor="textSecondary" style={styles.dateLabel}>
                  {formatDisplayDate(group.date)}
                </ThemedText>
                {group.entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.recordRow,
                      { borderColor: theme.divider },
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ${entry.status}`}
                      onPress={() => onToggle?.(entry)}
                      style={({ pressed }) => [
                        styles.statusToggle,
                        {
                          backgroundColor:
                            entry.status === 'present'
                              ? theme.successBackground
                              : theme.errorBackground,
                          borderColor:
                            entry.status === 'present' ? theme.success : theme.error,
                        },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <MovaIcon
                        name={entry.status === 'present' ? 'check' : 'x'}
                        size={12}
                        color={entry.status === 'present' ? theme.success : theme.error}
                        strokeWidth={2.4}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: entry.status === 'present' ? theme.success : theme.error,
                          fontWeight: '700',
                        }}>
                        {entry.status === 'present' ? 'Present' : 'Absent'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete record"
                      hitSlop={8}
                      onPress={() => onDeleteRecord?.(entry)}
                      style={({ pressed }) => pressed && { opacity: 0.6 }}>
                      <ThemedText type="caption" style={{ color: theme.error }}>
                        Delete
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        <ThemedButton
          title="Close"
          variant="outline"
          onPress={onClose}
          style={{ marginTop: Spacing.sm }}
        />
      </ThemedCard>
    </View>
  );
}

export function AttendanceHistoryModal({
  visible,
  subject = null,
  records = [],
  onToggle,
  onDeleteRecord,
  onAddRecord,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <HistoryContent
        key={subject?.id ?? 'history'}
        subject={subject}
        records={records}
        onToggle={onToggle}
        onDeleteRecord={onDeleteRecord}
        onAddRecord={onAddRecord}
        onClose={onClose}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  modalCard: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  quickDateCol: {
    flexDirection: 'column',
    gap: 4,
    paddingTop: 2,
  },
  smallDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: Borders.thin,
    alignItems: 'center',
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  scrollBody: {
    maxHeight: 320,
  },
  emptyWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  dateGroup: {
    marginBottom: Spacing.md,
  },
  dateLabel: {
    marginBottom: Spacing.xs,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: Borders.thin,
    gap: Spacing.sm,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
  },
});
