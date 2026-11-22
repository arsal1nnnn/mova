/**
 * Mova Campus — Attendance Import & Baseline Setup Modal
 *
 * Provides two frictionless onboarding/setup methods:
 * - Method A: Upload attendance report (PDF, JPG, JPEG, PNG) with OCR & multi-page digital extraction.
 * - Method B: Direct manual entry of historical baseline numbers.
 *
 * Always presents an editable preview table with instant percentage calculation
 * so students can review, correct, and add/remove subjects before saving.
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
import { Borders, Radius, Spacing } from '@/theme';
import {
  calculateAttendancePercentage,
  formatAttendancePercentage,
  validateAttendanceDate,
} from '@/utils/attendance-validators';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttendanceImportModal({ visible, onClose, onSaveComplete }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fileInputRef = useRef(null);

  const [method, setMethod] = useState('import'); // 'import' | 'manual'
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [pastedText, setPastedText] = useState('');
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Editable rows list
  const [rows, setRows] = useState([
    { id: '1', name: 'Mathematics', attended: '24', total: '28', target: '75' },
    { id: '2', name: 'Computer Science', attended: '30', total: '32', target: '75' },
    { id: '3', name: 'Physics', attended: '18', total: '24', target: '75' },
  ]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        attended: '0',
        total: '0',
        target: '75',
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

  const handleFileChange = async (event) => {
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
    setStatusMessage('Reading document and extracting text...');

    try {
      const result = await ocrService.processAttendanceReport({ file });
      if (result.success && result.subjects?.length > 0) {
        setRows(
          result.subjects.map((s, idx) => ({
            id: String(Date.now() + idx),
            name: s.name,
            attended: String(s.attended),
            total: String(s.total),
            target: '75',
          }))
        );
        setStatusMessage(result.message);
      } else {
        setStatusMessage(result.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParseText = async () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await ocrService.processAttendanceReport({ rawText: pastedText });
      if (result.success && result.subjects?.length > 0) {
        setRows(
          result.subjects.map((s, idx) => ({
            id: String(Date.now() + idx),
            name: s.name,
            attended: String(s.attended),
            total: String(s.total),
            target: '75',
          }))
        );
        setStatusMessage(result.message);
      } else {
        setErrorMessage('Could not find subjects in the text. You can add them in the table below.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error parsing text');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const dateVal = validateAttendanceDate(reportDate);
    if (!dateVal.isValid) {
      setErrorMessage(dateVal.error || 'Invalid report date');
      return;
    }

    const validItems = [];
    for (const r of rows) {
      const name = r.name.trim();
      if (!name) continue;

      const attended = parseInt(r.attended, 10);
      const total = parseInt(r.total, 10);
      const target = parseInt(r.target, 10) || 75;

      if (isNaN(attended) || attended < 0) {
        setErrorMessage(`"${name}": attended classes must be a non-negative number.`);
        return;
      }
      if (isNaN(total) || total < 0) {
        setErrorMessage(`"${name}": total classes must be a non-negative number.`);
        return;
      }
      if (attended > total) {
        setErrorMessage(`"${name}": attended classes (${attended}) cannot exceed total (${total}).`);
        return;
      }

      validItems.push({
        name,
        target_percentage: target,
        baseline_attended: attended,
        baseline_total: total,
        baseline_as_of_date: dateVal.sanitizedValue,
      });
    }

    if (validItems.length === 0) {
      setErrorMessage('Please provide at least one subject with valid details.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveComplete?.(validItems);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save baseline attendance.');
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
              <ThemedText type="h3">Attendance Setup</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Upload report document (PDF/Image) or enter baseline manually
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <ThemedText type="bodyStrong" style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Equal Method Tabs */}
          <View style={[styles.methodTabs, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable
              style={[
                styles.methodTab,
                method === 'import' && { backgroundColor: theme.primarySubtle, borderColor: theme.primary },
              ]}
              onPress={() => setMethod('import')}
            >
              <MovaIcon
                name="upload"
                size={16}
                color={method === 'import' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="bodySmallStrong"
                style={{ color: method === 'import' ? theme.primary : theme.textSecondary }}
              >
                Upload Report (PDF/Image)
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.methodTab,
                method === 'manual' && { backgroundColor: theme.primarySubtle, borderColor: theme.primary },
              ]}
              onPress={() => setMethod('manual')}
            >
              <MovaIcon
                name="edit"
                size={16}
                color={method === 'manual' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="bodySmallStrong"
                style={{ color: method === 'manual' ? theme.primary : theme.textSecondary }}
              >
                Manual Entry Table
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Method A: Upload & Document Preview */}
            {method === 'import' && (
              <ThemedCard variant="outlined" style={[styles.importCard, { borderColor: theme.border }]}>
                <ThemedText type="bodySmallStrong" style={styles.sectionHeading}>
                  Upload Attendance Report
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.helperText}>
                  Supported formats: PDF, JPG, JPEG, PNG (max 10MB). Automatically extracts subjects, attended, and total conducted.
                </ThemedText>

                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                )}

                {/* File Preview Card */}
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
                      variant="primary"
                      onPress={() => {
                        if (Platform.OS === 'web' && fileInputRef.current) {
                          fileInputRef.current.click();
                        } else {
                          setStatusMessage('Select a document or paste text below.');
                        }
                      }}
                      loading={isProcessing}
                      leftIcon={<MovaIcon name="upload" size={14} color={theme.primaryText} />}
                    >
                      Choose PDF or Image
                    </ThemedButton>
                  </View>
                )}

                {/* Paste Text Option */}
                <View style={styles.pasteSection}>
                  <ThemedText type="caption" themeColor="textSecondary" style={{ marginBottom: 4 }}>
                    Or paste text from student portal directly:
                  </ThemedText>
                  <ThemedTextInput
                    placeholder="e.g. Mathematics 24/28 85%&#10;Physics 18/24 75%"
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
                      Parse Text
                    </ThemedButton>
                  )}
                </View>
              </ThemedCard>
            )}

            {/* Status & Processing Indicator */}
            {isProcessing && (
              <View style={[styles.processingWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600', marginLeft: 8 }}>
                  Processing document and verifying attendance columns...
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

            {/* As of Date */}
            <View style={styles.dateRow}>
              <ThemedText type="label" themeColor="textSecondary">
                Report As-Of Date:
              </ThemedText>
              <ThemedTextInput
                value={reportDate}
                onChangeText={setReportDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                style={{ flex: 1 }}
              />
            </View>

            {/* Editable Preview Table */}
            <View style={styles.previewHeaderRow}>
              <ThemedText type="label" themeColor="textPrimary">
                Editable Preview ({rows.length} Subjects)
              </ThemedText>
              <Pressable onPress={handleAddRow} style={styles.addRowBtn}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                  + Add Subject
                </ThemedText>
              </Pressable>
            </View>

            {rows.map((row) => {
              const att = parseInt(row.attended, 10) || 0;
              const tot = parseInt(row.total, 10) || 0;
              const pct = calculateAttendancePercentage(tot, att);
              const isInvalid = att > tot;

              return (
                <ThemedCard
                  key={row.id}
                  variant="outlined"
                  style={[
                    styles.rowCard,
                    { borderColor: isInvalid ? theme.error : theme.border, backgroundColor: theme.surface },
                  ]}
                >
                  <View style={styles.rowMain}>
                    <View style={styles.rowNameCol}>
                      <ThemedTextInput
                        value={row.name}
                        onChangeText={(v) => handleUpdateRow(row.id, 'name', v)}
                        placeholder="Subject Name"
                      />
                    </View>
                    <Pressable
                      onPress={() => handleRemoveRow(row.id)}
                      style={styles.removeRowBtn}
                      accessibilityLabel="Remove row"
                    >
                      <ThemedText type="caption" style={{ color: theme.error }}>✕</ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.rowDetails}>
                    <View style={styles.numInputGroup}>
                      <ThemedText type="caption" themeColor="textSecondary">Attended</ThemedText>
                      <ThemedTextInput
                        value={row.attended}
                        onChangeText={(v) => handleUpdateRow(row.id, 'attended', v.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    <ThemedText type="bodyStrong" style={{ marginTop: 28, color: theme.textSecondary }}>/</ThemedText>

                    <View style={styles.numInputGroup}>
                      <ThemedText type="caption" themeColor="textSecondary">Total</ThemedText>
                      <ThemedTextInput
                        value={row.total}
                        onChangeText={(v) => handleUpdateRow(row.id, 'total', v.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    <View style={styles.numInputGroup}>
                      <ThemedText type="caption" themeColor="textSecondary">Target %</ThemedText>
                      <ThemedTextInput
                        value={row.target}
                        onChangeText={(v) => handleUpdateRow(row.id, 'target', v.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                    </View>

                    <View style={styles.pctBadge}>
                      <ThemedText type="caption" themeColor="textMuted">Current</ThemedText>
                      <ThemedText
                        type="bodySmallStrong"
                        style={{ color: isInvalid ? theme.error : pct >= 75 ? theme.success : theme.warning }}
                      >
                        {tot > 0 ? `${pct}%` : '—'}
                      </ThemedText>
                    </View>
                  </View>
                </ThemedCard>
              );
            })}
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
              title="Save All Subjects"
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
  methodTabs: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: Borders.thin,
    padding: 3,
    marginBottom: Spacing.sm,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm,
    gap: 6,
    borderWidth: Borders.thin,
    borderColor: 'transparent',
  },
  scrollArea: {
    maxHeight: 460,
  },
  importCard: {
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
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
  rowNameCol: {
    flex: 1,
  },
  removeRowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  numInputGroup: {
    flex: 1,
  },
  pctBadge: {
    minWidth: 50,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: Borders.thin,
  },
});
