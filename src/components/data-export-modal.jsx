/**
 * Mova Campus — Data Export Modal
 *
 * Allows students to export their complete study records, schedules, attendance,
 * and reward history in machine-readable JSON format.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme } from '@/hooks/use-theme';
import { privacyService } from '@/services/privacy-service';
import { Borders, Radius, Spacing } from '@/theme';

export function DataExportModal({ visible, onClose }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [exportData, setExportData] = useState(null);
  const [downloadMessage, setDownloadMessage] = useState(null);

  useEffect(() => {
    if (!visible) return;
    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);
      setDownloadMessage(null);
      try {
        const { data, error } = await privacyService.exportUserData();
        if (!isCancelled) {
          if (error) {
            setDownloadMessage('Could not generate export at this time.');
          } else {
            setExportData(data);
          }
        }
      } catch {
        if (!isCancelled) setDownloadMessage('Export generation failed.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [visible]);

  const handleDownload = () => {
    if (!exportData) return;

    const jsonString = JSON.stringify(exportData, null, 2);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mova-campus-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadMessage('Download started successfully!');
    } else {
      setDownloadMessage('Data prepared. Copy data to clipboard below.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="h3" style={{ fontWeight: '700' }}>
                Export Personal Data
              </ThemedText>
              <ThemedText type="caption" color="textSecondary">
                Download a complete copy of all your academic records
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
              <MovaIcon name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="caption" color="textSecondary" style={{ marginTop: Spacing.sm }}>
                Compiling database records into JSON...
              </ThemedText>
            </View>
          ) : exportData ? (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* Summary Cards */}
              <ThemedCard variant="outlined" style={styles.summaryCard}>
                <ThemedText type="label" style={{ fontWeight: '700', marginBottom: Spacing.xs }}>
                  Export Manifest
                </ThemedText>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <ThemedText type="caption" color="textSecondary">Tasks</ThemedText>
                    <ThemedText type="bodyStrong">{exportData.tasks?.length || 0}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="caption" color="textSecondary">Classes</ThemedText>
                    <ThemedText type="bodyStrong">{exportData.timetable_classes?.length || 0}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="caption" color="textSecondary">Subjects</ThemedText>
                    <ThemedText type="bodyStrong">{exportData.attendance_subjects?.length || 0}</ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="caption" color="textSecondary">Attendance</ThemedText>
                    <ThemedText type="bodyStrong">{exportData.attendance_records?.length || 0}</ThemedText>
                  </View>
                </View>
              </ThemedCard>

              {downloadMessage && (
                <View style={[styles.messageBox, { backgroundColor: theme.primarySubtle }]}>
                  <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
                    {downloadMessage}
                  </ThemedText>
                </View>
              )}

              {/* Raw JSON Preview */}
              <ThemedText type="caption" color="textSecondary" style={{ marginBottom: 4 }}>
                JSON Preview:
              </ThemedText>
              <ThemedCard variant="flat" style={styles.codeCard}>
                <ThemedText type="code" style={styles.codeText} numberOfLines={12}>
                  {JSON.stringify(exportData, null, 2)}
                </ThemedText>
              </ThemedCard>

              <ThemedButton
                title="Download JSON Export (.json)"
                variant="primary"
                onPress={handleDownload}
                style={{ marginTop: Spacing.md }}
              />
            </ScrollView>
          ) : (
            <View style={styles.errorBox}>
              <ThemedText type="bodySmall" color="error">
                {downloadMessage || 'Failed to prepare export.'}
              </ThemedText>
            </View>
          )}

          {/* Footer Action */}
          <View style={styles.footer}>
            <ThemedButton title="Done" variant="outline" onPress={onClose} />
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  scrollArea: {
    maxHeight: 400,
  },
  summaryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    alignItems: 'center',
  },
  messageBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  codeCard: {
    padding: Spacing.sm,
    backgroundColor: '#F5F2EC',
    borderRadius: Radius.sm,
  },
  codeText: {
    fontSize: 11,
    lineHeight: 16,
  },
  errorBox: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  footer: {
    paddingTop: Spacing.sm,
    borderTopWidth: Borders.thin,
    borderColor: 'rgba(0,0,0,0.06)',
    marginTop: Spacing.xs,
  },
});
