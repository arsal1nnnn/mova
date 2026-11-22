/**
 * Mova Campus — Attendance Screen
 *
 * Full attendance tracking interface:
 * - High-impact overall attendance data visualization
 * - Safe bunk calculation deck & recovery margins
 * - Timetable routine subject import suggestion banner
 * - Subject-level cards with progress bars and threshold markers
 * - Quick mark present/absent with date tracking
 * - Detailed attendance history modal with toggle & date-adding
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import {
  AttendanceHistoryModal,
  AttendanceImportModal,
  AttendancePredictionModal,
  AttendanceTrendChart,
  EmptyState,
  MetricStrip,
  MovaIcon,
  PageHeader,
  ProfileModal,
  ScreenContainer,
  SectionHeader,
  SubjectCard,
  SubjectFormModal,
  ThemedButton,
  ThemedCard,
  ThemedText,
} from '@/components';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { attendanceService } from '@/services/attendance-service';
import { profileService } from '@/services/profile-service';
import { timetableService } from '@/services/timetable-service';
import { Borders, Radius, Spacing } from '@/theme';
import {
  formatAttendancePercentage,
  getAttendanceStatusLabel,
} from '@/utils/attendance-validators';

function getLocalDateISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendanceScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  // Profile modal state
  const [profile, setProfile] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Data state
  const [subjects, setSubjects] = useState([]);
  const [overallSummary, setOverallSummary] = useState(null);
  const [timetableSuggestions, setTimetableSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Modal state
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historySubject, setHistorySubject] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [predictionModalVisible, setPredictionModalVisible] = useState(false);
  const [timetableClasses, setTimetableClasses] = useState([]);

  const reload = useCallback(() => setReloadTrigger((p) => p + 1), []);

  // Load profile
  useEffect(() => {
    let isMounted = true;
    profileService.getProfile().then(({ profile: p }) => {
      if (isMounted && p) setProfile(p);
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Load subjects with summaries
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!attendanceService.isConfigured()) {
        if (isMounted) {
          setIsLoading(false);
          setSubjects([]);
          setError(null);
        }
        return;
      }

      try {
        const result = await attendanceService.getSubjectsWithSummaries();

        if (!isMounted) return;

        let currentNames = new Set();
        if (result.error) {
          setError(result.error.message || 'Could not load attendance data.');
          setSubjects([]);
        } else {
          setError(null);
          setSubjects(result.subjects);
          setOverallSummary(result.overallSummary);
          currentNames = new Set(result.subjects.map((s) => s.name.trim().toLowerCase()));
        }

        // Check for subjects in timetable not yet added to attendance
        if (timetableService.isConfigured()) {
          const { classes } = await timetableService.getClasses();
          if (isMounted && classes && classes.length > 0) {
            setTimetableClasses(classes);
            const uniqueTimetableNames = Array.from(
              new Set(classes.map((c) => c.subject_name?.trim()).filter(Boolean))
            );
            const missing = uniqueTimetableNames.filter(
              (name) => !currentNames.has(name.toLowerCase())
            );
            setTimetableSuggestions(missing);
          }
        }
      } catch {
        if (isMounted) {
          setError('Could not load attendance data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [reloadTrigger, user?.id]);

  // Subject CRUD handlers
  const handleSaveSubject = async (data) => {
    if (editingSubject?.id) {
      const result = await attendanceService.updateSubject(editingSubject.id, data);
      if (result.error) {
        showAlert('Error', result.error.message);
        return { success: false, error: result.error };
      }
    } else {
      const result = await attendanceService.createSubject(data);
      if (result.error) {
        showAlert('Error', result.error.message);
        return { success: false, error: result.error };
      }
    }
    reload();
    return { success: true };
  };

  const handleImportTimetableSubjects = async () => {
    if (timetableSuggestions.length === 0) return;
    for (const name of timetableSuggestions) {
      await attendanceService.createSubject({ name, target_percentage: 75 });
    }
    reload();
  };

  const handleDeleteSubject = (subject) => {
    confirmAction(
      'Delete Subject',
      `Delete "${subject.name}" and all associated attendance records? This cannot be undone.`,
      async () => {
        const result = await attendanceService.deleteSubject(subject.id);
        if (result.error) {
          showAlert('Error', result.error.message);
        } else {
          reload();
        }
      }
    );
  };

  // Attendance marking
  const handleMarkAttendance = async (subject, status) => {
    const result = await attendanceService.markAttendance({
      subject_id: subject.id,
      date: getLocalDateISO(),
      status,
    });

    if (result.error) {
      showAlert('Error', result.error.message);
    } else {
      reload();
    }
  };

  const handleAddDatedRecord = async (subjectId, date, status) => {
    const result = await attendanceService.markAttendance({
      subject_id: subjectId,
      date,
      status,
    });

    if (result.error) {
      showAlert('Error', result.error.message);
      return false;
    } else {
      if (result.record) {
        setHistoryRecords((prev) => [result.record, ...prev]);
      }
      reload();
      return true;
    }
  };

  // History modal
  const handleViewHistory = async (subject) => {
    setHistorySubject(subject);
    setHistoryRecords(subject.records || []);
    setHistoryModalVisible(true);
  };

  const handleToggleRecord = async (record) => {
    const newStatus = record.status === 'present' ? 'absent' : 'present';
    const result = await attendanceService.updateRecord(record.id, newStatus);
    if (result.error) {
      showAlert('Error', result.error.message);
    } else {
      setHistoryRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: newStatus } : r))
      );
      reload();
    }
  };

  const handleDeleteRecord = (record) => {
    confirmAction(
      'Delete Record',
      'Delete this attendance entry?',
      async () => {
        const result = await attendanceService.deleteRecord(record.id);
        if (result.error) {
          showAlert('Error', result.error.message);
        } else {
          setHistoryRecords((prev) => prev.filter((r) => r.id !== record.id));
          reload();
        }
      }
    );
  };

  // Cross-platform alert/confirm helpers
  function showAlert(title, message) {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function confirmAction(title, message, onConfirm) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ]);
    }
  }

  // Metric items for top summary
  const metricItems = overallSummary && overallSummary.totalClasses > 0
    ? [
        { label: 'Overall', value: formatAttendancePercentage(overallSummary.percentage), tone: overallSummary.status === 'below_target' ? 'error' : 'success' },
        { label: 'Attended', value: overallSummary.attendedClasses, tone: 'success' },
        { label: 'Missed', value: overallSummary.missedClasses, tone: 'error' },
        {
          label: overallSummary.safeBunks > 0 ? 'Safe Bunks' : 'To Recover',
          value: overallSummary.safeBunks > 0
            ? `+${overallSummary.safeBunks}`
            : overallSummary.classesToRecover > 0
            ? `${overallSummary.classesToRecover}`
            : '0',
          tone: overallSummary.safeBunks > 0 ? 'success' : overallSummary.classesToRecover > 0 ? 'warning' : 'primary',
          size: 'bodySmallStrong',
        },
      ]
    : null;

  return (
    <ScreenContainer>
      <PageHeader
        title="Attendance & Bunks"
        subtitle={`${subjects.length} subject${subjects.length !== 1 ? 's' : ''} tracked`}
        userProfile={profile}
        onAvatarPress={() => setProfileModalVisible(true)}
        action={
          <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
            <ThemedButton
              title="Upload Report"
              variant="outline"
              size="sm"
              onPress={() => setImportModalVisible(true)}
              leftIcon={<MovaIcon name="upload" size={14} color={theme.primary} />}
            />
            <ThemedButton
              title="Forecast"
              variant="outline"
              size="sm"
              onPress={() => setPredictionModalVisible(true)}
              leftIcon={<MovaIcon name="trending-up" size={14} color={theme.primary} />}
            />
            <ThemedButton
              title="+ Add Subject"
              variant="primary"
              size="sm"
              onPress={() => {
                setEditingSubject(null);
                setSubjectModalVisible(true);
              }}
            />
          </View>
        }
      />

      {/* Overall Metrics Strip */}
      {metricItems && <MetricStrip items={metricItems} />}

      {/* Timetable Subject Suggestions Banner */}
      {timetableSuggestions.length > 0 && (
        <ThemedCard
          variant="outlined"
          style={[styles.suggestionCard, { borderColor: theme.borderFocus }]}>
          <View style={styles.suggestionRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.suggestionTitleRow}>
                <MovaIcon name="sparkle" size={14} color={theme.primary} />
                <ThemedText type="label" style={{ color: theme.primary, fontWeight: '700' }}>
                  Timetable Subjects Detected
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                Found in routine: {timetableSuggestions.join(', ')}
              </ThemedText>
            </View>
            <ThemedButton
              title={`Import (${timetableSuggestions.length})`}
              variant="outline"
              size="sm"
              onPress={handleImportTimetableSubjects}
            />
          </View>
        </ThemedCard>
      )}

      {/* Main Content */}
      <View style={styles.section}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText type="caption" themeColor="textMuted" style={{ marginTop: Spacing.sm }}>
              Loading attendance data...
            </ThemedText>
          </View>
        ) : error ? (
          <ThemedCard
            variant="outlined"
            style={[styles.errorCard, { borderColor: theme.error }]}>
            <ThemedText type="bodySmallStrong" style={{ color: theme.error }}>
              Could not load attendance
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {error}
            </ThemedText>
            <ThemedButton
              title="Retry"
              variant="outline"
              size="sm"
              onPress={reload}
              style={{ alignSelf: 'flex-start', marginTop: Spacing.xs }}
            />
          </ThemedCard>
        ) : subjects.length === 0 ? (
          <EmptyState
            iconName="attendance"
            title="Setup Your Attendance"
            description="Choose how you would like to get started. You can upload an official college attendance report (PDF or image) or enter your baseline subjects manually."
            action={
              <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
                <ThemedButton
                  title="Upload Report (PDF/Image)"
                  variant="outline"
                  size="sm"
                  onPress={() => setImportModalVisible(true)}
                  leftIcon={<MovaIcon name="upload" size={14} color={theme.primary} />}
                />
                <ThemedButton
                  title="Enter Baseline Manually"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setEditingSubject(null);
                    setSubjectModalVisible(true);
                  }}
                  leftIcon={<MovaIcon name="edit" size={14} color={theme.primaryText} />}
                />
              </View>
            }
          />
        ) : (
          <View>
            <AttendanceTrendChart subjects={subjects} style={{ marginBottom: Spacing.md }} />
            <SectionHeader title="Your Enrolled Subjects" />
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onMarkPresent={(s) => handleMarkAttendance(s, 'present')}
                onMarkAbsent={(s) => handleMarkAttendance(s, 'absent')}
                onViewHistory={handleViewHistory}
                onEdit={(s) => {
                  setEditingSubject(s);
                  setSubjectModalVisible(true);
                }}
                onDelete={handleDeleteSubject}
              />
            ))}
          </View>
        )}
      </View>

      {/* Subject Form Modal */}
      <SubjectFormModal
        visible={subjectModalVisible}
        subject={editingSubject}
        onClose={() => {
          setSubjectModalVisible(false);
          setEditingSubject(null);
        }}
        onSave={handleSaveSubject}
        onDelete={handleDeleteSubject}
      />

      {/* Attendance History Modal */}
      <AttendanceHistoryModal
        visible={historyModalVisible}
        subject={historySubject}
        records={historyRecords}
        onToggle={handleToggleRecord}
        onDeleteRecord={handleDeleteRecord}
        onAddRecord={handleAddDatedRecord}
        onClose={() => {
          setHistoryModalVisible(false);
          setHistorySubject(null);
          setHistoryRecords([]);
        }}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onProfileUpdated={(p) => {
          if (p) setProfile(p);
        }}
      />

      {/* Attendance Baseline Setup / Import Modal */}
      <AttendanceImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSaveComplete={async (items) => {
          await attendanceService.batchUpsertSubjects(items);
          reload();
        }}
      />

      {/* Attendance Prediction / Forecast Modal */}
      <AttendancePredictionModal
        visible={predictionModalVisible}
        onClose={() => setPredictionModalVisible(false)}
        subjects={subjects}
        timetable={timetableClasses}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  loadingWrap: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  errorCard: {
    padding: Spacing.md,
    gap: Spacing.xxs,
    borderRadius: Radius.lg,
  },
  suggestionCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
