/**
 * Mova Campus — Timetable Document Import Modal
 *
 * Allows students to upload a timetable schedule (PDF, JPG, JPEG, PNG)
 * or paste schedule text.
 * - Extracts weekday, time ranges, subject name, and room numbers across multi-page documents.
 * - Displays a document preview card with file format & size validation.
 * - Provides an editable preview table for review, additions, and corrections.
 * - Deduplicates against existing classes to prevent duplicate timetable slots.
 */

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { ocrService } from '@/services/ocr-service';
import { timetableService } from '@/services/timetable-service';
import { Borders, Radius, Spacing } from '@/theme';
import { detectTimetableConflicts } from '@/utils/ocr-parser';
import { WEEKDAYS } from '@/utils/timetable-validators';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TimetableImportModal({ visible, onClose, onSaveComplete }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fileInputRef = useRef(null);

  const [pastedText, setPastedText] = useState('');
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Editable rows list
  const [rows, setRows] = useState([
    { id: '1', subject_name: 'Data Structures', weekday: 1, start_time: '09:00', end_time: '10:30', room: 'LH-1' },
    { id: '2', subject_name: 'Database Systems', weekday: 1, start_time: '11:00', end_time: '12:30', room: 'Lab 2' },
    { id: '3', subject_name: 'Algorithms', weekday: 2, start_time: '10:00', end_time: '11:30', room: 'Room 204' },
  ]);

  const conflicts = React.useMemo(() => detectTimetableConflicts(rows), [rows]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        subject_name: '',
        weekday: 1,
        start_time: '09:00',
        end_time: '10:00',
        room: '',
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleFileUpload = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setSelectedFileMeta({
      name: file.name,
      size: file.size,
      type: file.type?.includes('pdf') || file.name.endsWith('.pdf') ? 'PDF Document' : 'Image',
      isPdf: file.type?.includes('pdf') || file.name.endsWith('.pdf'),
    });

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Reading document and extracting timetable...');

    try {
      const result = await ocrService.processTimetable({ file });
      if (result.success && result.classes?.length > 0) {
        setRows(
          result.classes.map((c, idx) => ({
            id: String(Date.now() + idx),
            subject_name: c.subject_name,
            weekday: c.weekday ?? 1,
            start_time: c.start_time ?? '09:00',
            end_time: c.end_time ?? '10:00',
            room: c.room || '',
          }))
        );
        setStatusMessage(result.message);
      } else {
        setStatusMessage(result.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process timetable document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParseText = async () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await ocrService.processTimetable({ rawText: pastedText });
      if (result.success && result.classes?.length > 0) {
        setRows(
          result.classes.map((c, idx) => ({
            id: String(Date.now() + idx),
            subject_name: c.subject_name,
            weekday: c.weekday ?? 1,
            start_time: c.start_time ?? '09:00',
            end_time: c.end_time ?? '10:00',
            room: c.room || '',
          }))
        );
        setStatusMessage(result.message);
      } else {
        setErrorMessage('Could not find schedule slots in the text. Add them in the table below.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error parsing timetable text');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const validCandidates = [];
    for (const r of rows) {
      const name = r.subject_name?.trim();
      if (!name) continue;

      validCandidates.push({
        subject_name: name,
        title: name,
        weekday: parseInt(r.weekday, 10),
        start_time: r.start_time?.trim(),
        end_time: r.end_time?.trim(),
        room: r.room?.trim() || null,
      });
    }

    if (validCandidates.length === 0) {
      setErrorMessage('Please provide at least one valid class slot.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await timetableService.batchImportClasses(validCandidates);
      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      await onSaveComplete?.(result);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to import timetable.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="h3">Import Timetable</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Upload schedule (PDF/Image) or paste weekly routine text
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <ThemedText type="bodyStrong" style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Upload & Paste Section */}
            <ThemedCard variant="outlined" style={[styles.uploadCard, { borderColor: theme.border }]}>
              <ThemedText type="bodySmallStrong" style={styles.sectionHeading}>
                Upload Schedule Document
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.helperText}>
                Supported formats: PDF, JPG, PNG, WEBP, CSV, TXT (max 10MB). Text extraction is processed locally in your browser. Existing duplicates are automatically skipped.
              </ThemedText>

              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.txt,application/pdf,image/png,image/jpeg,image/webp,text/csv,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              )}

              {/* Document Preview Card */}
              {selectedFileMeta ? (
                <View style={[styles.filePreviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.fileIconWrap}>
                    <ThemedText type="label" style={{ color: theme.primary, fontWeight: '700' }}>
                      {selectedFileMeta.isPdf ? 'PDF' : 'IMG'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="bodySmallStrong" numberOfLines={1}>
                      {selectedFileMeta.name}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {selectedFileMeta.type} • {formatFileSize(selectedFileMeta.size)}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    title="Replace"
                    variant="outline"
                    size="sm"
                    onPress={() => fileInputRef.current?.click()}
                  />
                </View>
              ) : (
                <View style={styles.uploadActions}>
                  <ThemedButton
                    title="Choose PDF or Image"
                    variant="primary"
                    onPress={() => {
                      if (Platform.OS === 'web' && fileInputRef.current) {
                        fileInputRef.current.click();
                      } else {
                        setStatusMessage('Select a document or paste timetable text below.');
                      }
                    }}
                    loading={isProcessing}
                    leftIcon={<MovaIcon name="upload" size={14} color={theme.primaryText} />}
                  />
                </View>
              )}

              {/* Paste Text Option */}
              <View style={styles.pasteSection}>
                <ThemedText type="caption" themeColor="textSecondary" style={{ marginBottom: 4 }}>
                  Or paste weekly schedule text:
                </ThemedText>
                <ThemedTextInput
                  placeholder="e.g. Monday:&#10;09:00 - 10:30 Data Structures Room 101&#10;11:00 - 12:30 Database Systems Lab 2"
                  value={pastedText}
                  onChangeText={setPastedText}
                  multiline
                  numberOfLines={3}
                />
                {pastedText.trim().length > 0 && (
                  <ThemedButton
                    variant="outline"
                    size="sm"
                    onPress={handleParseText}
                    loading={isProcessing}
                    style={{ marginTop: Spacing.xs, alignSelf: 'flex-start' }}
                  >
                    Parse Schedule
                  </ThemedButton>
                )}
              </View>
            </ThemedCard>

            {/* Status & Processing Indicator */}
            {isProcessing && (
              <View style={[styles.processingWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600', marginLeft: 8 }}>
                  Extracting weekly slots from document...
                </ThemedText>
              </View>
            )}

            {statusMessage && !isProcessing && (
              <View style={[styles.messageBanner, { backgroundColor: theme.primarySubtle, borderColor: theme.primary }]}>
                <MovaIcon name="sparkle" size={16} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.text, marginLeft: 6, flex: 1 }}>
                  {statusMessage}
                </ThemedText>
              </View>
            )}

            {errorMessage && (
              <View style={[styles.messageBanner, { backgroundColor: theme.errorBackground, borderColor: theme.error }]}>
                <MovaIcon name="alert" size={16} color={theme.error} />
                <ThemedText type="caption" style={{ color: theme.error, marginLeft: 6, flex: 1 }}>
                  {errorMessage}
                </ThemedText>
                <ThemedButton
                  title="Dismiss"
                  variant="outline"
                  size="sm"
                  onPress={() => setErrorMessage(null)}
                />
              </View>
            )}

            {/* Schedule Conflicts Warning Banner */}
            {conflicts.length > 0 && (
              <View
                style={[
                  styles.conflictBanner,
                  {
                    backgroundColor: theme.isDark ? '#3D251E' : '#FFF0E5',
                    borderColor: theme.isDark ? '#8A3B14' : '#F4A261',
                  },
                ]}
              >
                <MovaIcon name="alert" size={16} color={theme.isDark ? '#FF7A29' : '#EA580C'} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemedText
                    type="bodySmallStrong"
                    style={{ color: theme.isDark ? '#FF7A29' : '#EA580C', fontWeight: '700' }}
                  >
                    Schedule Conflict Detected ({conflicts.length})
                  </ThemedText>
                  {conflicts.map((c, i) => (
                    <ThemedText
                      key={i}
                      type="caption"
                      style={{ color: theme.isDark ? '#E5B198' : '#92400E', marginTop: 2, fontSize: 11 }}
                    >
                      • {c.message}
                    </ThemedText>
                  ))}
                </View>
              </View>
            )}

            {/* Editable Preview Table */}
            <View style={styles.previewHeaderRow}>
              <ThemedText type="label" themeColor="textPrimary">
                Editable Class Slots ({rows.length})
              </ThemedText>
              <Pressable onPress={handleAddRow} style={styles.addRowBtn}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                  + Add Class Slot
                </ThemedText>
              </Pressable>
            </View>

            {rows.map((row) => (
              <ThemedCard
                key={row.id}
                variant="outlined"
                style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.rowMain}>
                  <View style={{ flex: 1 }}>
                    <ThemedTextInput
                      value={row.subject_name}
                      onChangeText={(v) => handleUpdateRow(row.id, 'subject_name', v)}
                      placeholder="Subject Name"
                    />
                  </View>
                  <Pressable
                    onPress={() => handleRemoveRow(row.id)}
                    style={styles.removeRowBtn}
                    accessibilityLabel="Remove slot"
                  >
                    <ThemedText type="caption" style={{ color: theme.error }}>✕</ThemedText>
                  </Pressable>
                </View>

                {/* Weekday Selector */}
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((day) => {
                    const isSelected = row.weekday === day.value;
                    return (
                      <Pressable
                        key={day.value}
                        onPress={() => handleUpdateRow(row.id, 'weekday', day.value)}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{
                            color: isSelected ? theme.primaryText : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: 11,
                          }}
                        >
                          {day.short}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Times and Room */}
                <View style={styles.timesRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedTextInput
                      label="Start (HH:MM)"
                      value={row.start_time}
                      onChangeText={(v) => handleUpdateRow(row.id, 'start_time', v)}
                      placeholder="09:00"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedTextInput
                      label="End (HH:MM)"
                      value={row.end_time}
                      onChangeText={(v) => handleUpdateRow(row.id, 'end_time', v)}
                      placeholder="10:30"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedTextInput
                      label="Room"
                      value={row.room}
                      onChangeText={(v) => handleUpdateRow(row.id, 'room', v)}
                      placeholder="LH-1"
                    />
                  </View>
                </View>
              </ThemedCard>
            ))}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <ThemedButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={isSaving}
              style={{ flex: 1 }}
            />
            <ThemedButton
              title="Import Schedule"
              variant="primary"
              onPress={handleSave}
              loading={isSaving}
              disabled={rows.length === 0}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(37,35,33,0.36)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderWidth: Borders.thin,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  uploadCard: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionHeading: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
  },
  uploadActions: {
    marginVertical: Spacing.xs,
  },
  filePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  fileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: '#FDF1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteSection: {
    marginTop: Spacing.xs,
  },
  processingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xs,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xs,
    gap: 6,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xs,
  },
  addRowBtn: {
    paddingVertical: 4,
  },
  rowCard: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  removeRowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: Borders.thin,
  },
});
