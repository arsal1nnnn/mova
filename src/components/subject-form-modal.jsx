/**
 * Mova Campus — Subject Form Modal (Manual Entry & Edit)
 *
 * Bottom-sheet style modal to create/edit a subject with:
 * - Subject name
 * - Attendance target percentage (default 75%)
 * - Baseline historical classes conducted (total)
 * - Baseline historical classes attended
 * - Baseline as-of date (last updated date)
 * - Instant live calculation preview (percentage, safe bunks, recovery)
 * - Delete action when editing an existing subject
 */

import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { Borders, Radius, Spacing } from '@/theme';
import {
  calculateAttendancePercentage,
  calculateSafeBunks,
  calculateClassesToRecover,
  validateSubjectInput,
} from '@/utils/attendance-validators';

const TARGET_PRESETS = [60, 65, 70, 75, 80, 85, 90];

function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function SubjectFormContent({ subject, onClose, onSave, onDelete }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(subject?.id);

  const [name, setName] = useState(subject?.name || '');
  const [targetPercentage, setTargetPercentage] = useState(
    typeof subject?.target_percentage === 'number' ? String(subject.target_percentage) : '75'
  );
  const [baselineAttended, setBaselineAttended] = useState(
    typeof subject?.baseline_attended === 'number' ? String(subject.baseline_attended) : '0'
  );
  const [baselineTotal, setBaselineTotal] = useState(
    typeof subject?.baseline_total === 'number' ? String(subject.baseline_total) : '0'
  );
  const [baselineAsOfDate, setBaselineAsOfDate] = useState(
    subject?.baseline_as_of_date || getTodayIso()
  );

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live calculation preview
  const livePreview = useMemo(() => {
    const att = parseInt(baselineAttended, 10) || 0;
    const tot = parseInt(baselineTotal, 10) || 0;
    const tgt = parseInt(targetPercentage, 10) || 75;

    if (tot <= 0) {
      return { pct: 0, safeBunks: 0, recover: 0, status: 'no_data', isValid: true };
    }
    if (att > tot) {
      return { pct: 0, safeBunks: 0, recover: 0, status: 'invalid', isValid: false, error: 'Attended cannot exceed total' };
    }

    const pct = calculateAttendancePercentage(tot, att);
    const safeBunks = calculateSafeBunks(tot, att, tgt);
    const recover = calculateClassesToRecover(tot, att, tgt);
    const status = pct >= tgt ? 'on_track' : pct >= tgt - 5 ? 'at_risk' : 'below_target';

    return { pct, safeBunks, recover, status, isValid: true };
  }, [baselineAttended, baselineTotal, targetPercentage]);

  const handleSubmit = async () => {
    const payload = {
      name,
      target_percentage: targetPercentage.trim() ? Number(targetPercentage) : undefined,
      baseline_attended: baselineAttended.trim() ? Number(baselineAttended) : 0,
      baseline_total: baselineTotal.trim() ? Number(baselineTotal) : 0,
      baseline_as_of_date: baselineAsOfDate.trim() || undefined,
    };

    const validation = validateSubjectInput(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await onSave?.(validation.sanitizedData);
      if (result === true || (result && result.success)) {
        onClose?.();
      } else if (result && result.error) {
        setServerError(result.error.message || String(result.error));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !subject?.id) return;
    setIsDeleting(true);
    try {
      await onDelete?.(subject);
      onClose?.();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to delete subject.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.backdrop,
        { backgroundColor: 'rgba(37,35,33,0.36)' },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close subject form"
        style={styles.dismissOverlay}
        onPress={onClose}
      />

      <ThemedCard
        variant="elevated"
        style={[
          styles.modalCard,
          {
            paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.md),
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.border,
          },
        ]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View>
              <ThemedText type="h3">{isEditing ? 'Edit Subject' : 'Add Subject (Manual Entry)'}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Enter conducted classes & attendance target
              </ThemedText>
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

          {(Object.keys(errors).length > 0 || serverError) && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: theme.errorBackground, borderColor: theme.error },
              ]}>
              {serverError && (
                <ThemedText key="server" type="caption" style={{ color: theme.error, fontWeight: '600' }}>
                  • {serverError}
                </ThemedText>
              )}
              {Object.entries(errors).map(([field, msg]) => (
                <ThemedText key={field} type="caption" style={{ color: theme.error }}>
                  • {msg}
                </ThemedText>
              ))}
            </View>
          )}

          {/* Subject Name */}
          <ThemedTextInput
            label="Subject Name *"
            placeholder="e.g. Operating Systems, Data Structures"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            maxLength={100}
          />

          {/* Target Percentage */}
          <ThemedTextInput
            label="Attendance Target (%) *"
            placeholder="75"
            value={targetPercentage}
            onChangeText={(val) => {
              setTargetPercentage(val);
              if (errors.target_percentage) {
                setErrors((prev) => ({ ...prev, target_percentage: undefined }));
              }
            }}
            keyboardType="numeric"
            error={errors.target_percentage}
            maxLength={3}
          />

          <View style={styles.presetsRow}>
            {TARGET_PRESETS.map((preset) => {
              const isSelected = targetPercentage === String(preset);
              return (
                <Pressable
                  key={preset}
                  accessibilityRole="button"
                  onPress={() => setTargetPercentage(String(preset))}
                  style={({ pressed }) => [
                    styles.presetBtn,
                    {
                      backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? theme.primary : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    }}>
                    {preset}%
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Baseline Attendance Numbers */}
          <View style={styles.numbersGrid}>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                label="Classes Attended"
                placeholder="0"
                value={baselineAttended}
                onChangeText={(val) => {
                  setBaselineAttended(val.replace(/[^0-9]/g, ''));
                  if (errors.baseline_attended) setErrors((p) => ({ ...p, baseline_attended: undefined }));
                }}
                keyboardType="numeric"
                error={errors.baseline_attended}
                maxLength={4}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                label="Total Conducted"
                placeholder="0"
                value={baselineTotal}
                onChangeText={(val) => {
                  setBaselineTotal(val.replace(/[^0-9]/g, ''));
                  if (errors.baseline_total) setErrors((p) => ({ ...p, baseline_total: undefined }));
                }}
                keyboardType="numeric"
                error={errors.baseline_total}
                maxLength={4}
              />
            </View>
          </View>

          {/* As-of Date */}
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                label="Last Updated Date (YYYY-MM-DD)"
                placeholder="2026-11-22"
                value={baselineAsOfDate}
                onChangeText={(val) => {
                  setBaselineAsOfDate(val);
                  if (errors.baseline_as_of_date) setErrors((p) => ({ ...p, baseline_as_of_date: undefined }));
                }}
                maxLength={10}
                error={errors.baseline_as_of_date}
              />
            </View>
            <ThemedButton
              title="Today"
              variant="outline"
              size="sm"
              onPress={() => setBaselineAsOfDate(getTodayIso())}
              style={{ marginTop: 22 }}
            />
          </View>

          {/* Live Preview Card */}
          {parseInt(baselineTotal, 10) > 0 && livePreview.isValid && (
            <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.previewHeader}>
                <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '600' }}>
                  CALCULATED ATTENDANCE SUMMARY
                </ThemedText>
                <ThemedText type="bodyStrong" style={{ color: theme.primary }}>
                  {livePreview.pct}%
                </ThemedText>
              </View>

              <View style={styles.previewStats}>
                <View style={styles.previewStat}>
                  <ThemedText type="caption" themeColor="textMuted">Attended</ThemedText>
                  <ThemedText type="bodySmallStrong" style={{ color: theme.success }}>
                    {baselineAttended || '0'}
                  </ThemedText>
                </View>
                <View style={styles.previewStat}>
                  <ThemedText type="caption" themeColor="textMuted">Missed</ThemedText>
                  <ThemedText type="bodySmallStrong" style={{ color: theme.error }}>
                    {Math.max(0, (parseInt(baselineTotal, 10) || 0) - (parseInt(baselineAttended, 10) || 0))}
                  </ThemedText>
                </View>
                <View style={styles.previewStat}>
                  <ThemedText type="caption" themeColor="textMuted">Total</ThemedText>
                  <ThemedText type="bodySmallStrong">{baselineTotal || '0'}</ThemedText>
                </View>
                <View style={styles.previewStat}>
                  <ThemedText type="caption" themeColor="textMuted">
                    {livePreview.safeBunks > 0 ? 'Safe Bunks' : 'Recover'}
                  </ThemedText>
                  <ThemedText
                    type="bodySmallStrong"
                    style={{ color: livePreview.safeBunks > 0 ? theme.success : theme.warning }}>
                    {livePreview.safeBunks > 0 ? `+${livePreview.safeBunks}` : livePreview.recover}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            {isEditing && (
              <ThemedButton
                title="Delete"
                variant="outline"
                onPress={handleDelete}
                loading={isDeleting}
                disabled={isSubmitting}
                style={[styles.deleteBtn, { borderColor: theme.error }]}
                textStyle={{ color: theme.error }}
              />
            )}
            <ThemedButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={isSubmitting || isDeleting}
              style={styles.actionBtn}
            />
            <ThemedButton
              title={isEditing ? 'Save Changes' : 'Save Subject'}
              variant="primary"
              loading={isSubmitting}
              disabled={isDeleting}
              onPress={handleSubmit}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </ThemedCard>
    </KeyboardAvoidingView>
  );
}

export function SubjectFormModal({ visible, subject = null, onClose, onSave, onDelete }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SubjectFormContent
        key={subject?.id ?? 'new-subject'}
        subject={subject}
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
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
    maxWidth: 580,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderWidth: Borders.thin,
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
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.sm,
    gap: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },
  presetBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numbersGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  previewCard: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
  },
  previewStat: {
    alignItems: 'center',
    gap: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  deleteBtn: {
    minWidth: 80,
  },
});
