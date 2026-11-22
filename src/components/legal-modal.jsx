/**
 * Mova Campus — Legal Documents Modal (Terms & Privacy Policy)
 *
 * Provides complete, transparent, and accessible disclosure regarding:
 * - Student data collection and processing.
 * - Client-side OCR privacy guarantees.
 * - Social features and strict privacy isolation.
 * - Data export and account deletion rights.
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovaIcon } from '@/components/mova-icon';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Borders, Radius, Spacing } from '@/theme';

export function LegalModal({ visible, onClose, initialTab = 'terms' }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(initialTab);

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
                Legal & Privacy Disclosures
              </ThemedText>
              <ThemedText type="caption" color="textSecondary">
                Student data protection and governance policy
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
              <MovaIcon name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              onPress={() => setActiveTab('terms')}
              style={[
                styles.tabBtn,
                activeTab === 'terms' && [styles.tabBtnActive, { backgroundColor: theme.surface }],
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  fontWeight: activeTab === 'terms' ? '700' : '500',
                  color: activeTab === 'terms' ? theme.primary : theme.textSecondary,
                }}
              >
                Terms of Service
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('privacy')}
              style={[
                styles.tabBtn,
                activeTab === 'privacy' && [styles.tabBtnActive, { backgroundColor: theme.surface }],
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  fontWeight: activeTab === 'privacy' ? '700' : '500',
                  color: activeTab === 'privacy' ? theme.primary : theme.textSecondary,
                }}
              >
                Privacy Policy
              </ThemedText>
            </Pressable>
          </View>

          {/* Legal Document Content */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator>
            <View style={[styles.disclaimerBox, { backgroundColor: theme.primarySubtle }]}>
              <MovaIcon name="alert-triangle" size={16} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 6, flex: 1, fontSize: 11 }}>
                Important: These terms represent operational drafts outlining student data handling and must undergo formal legal counsel review prior to general public commercial deployment.
              </ThemedText>
            </View>

            {activeTab === 'terms' ? (
              <View style={styles.docBody}>
                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  1. Acceptance of Terms
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  By creating an account or using Mova Campus, you agree to these Terms of Service. Mova Campus is built exclusively for enrolled students to assist in academic organization, attendance tracking, and campus networking.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  2. Student Conduct & Acceptable Use
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  You agree not to upload abusive, harassing, or unauthorized materials. You may not harvest fellow student records, reverse engineer the reward ledger, or spoof identity details. Violation of these standards may result in immediate account suspension.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  3. Academic Disclaimer & Calculations
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  Attendance percentage projections, safe bunk estimates, and exam recovery metrics provided by Mova Campus are advisory approximations calculated from data provided by the user. Mova Campus is an independent productivity tool and does not replace official university administrative records.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  4. Gamification, Points & Achievements
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  Points, badges, and XP awarded within Mova Campus have no monetary or cash value. Points are designed purely for motivational and academic engagement. Mova reserves the right to adjust reward criteria to prevent abuse or gaming of reward ledgers.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  5. Termination & Deletion
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  You retain complete ownership of your personal data and may permanently delete your account and all associated study records at any time directly through the Settings screen.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.docBody}>
                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  1. Information We Collect
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  • Account Information: Google/Apple OAuth identifier, name, chosen username, and optional profile bio.
                  {'\n'}• Study Data: Tasks, class schedules, enrolled subjects, and manual or imported attendance counts.
                  {'\n'}• Device & Logs: Operational crash analytics without sensitive personal markers.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  2. Client-Side Document Processing (OCR)
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  When you upload attendance PDFs or timetable documents, text extraction is performed client-side on your device wherever possible. Extracted records are presented in an editable confirmation table for your manual verification before being saved to your private database.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  3. Social Privacy & Zero Leakage
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  Friends and fellow students can ONLY view your display name, username, public streak (if enabled), public level, and public achievements. Friends CANNOT view your attendance history, missed classes, timetable, tasks, date of birth, or email address.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  4. Row Level Security & Encryption
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  All database tables employ PostgreSQL Row Level Security (RLS) enforcing that only authenticated requests verified by auth.uid() can read or modify user-specific records. Network communication is secured via modern TLS encryption.
                </ThemedText>

                <ThemedText type="bodyStrong" style={styles.sectionHeading}>
                  5. Your Data Rights: Export & Deletion
                </ThemedText>
                <ThemedText type="bodySmall" color="textSecondary" style={styles.para}>
                  You have the right to request a complete JSON export of all personal study data and the right to permanently purge your profile, records, and relationships through the Account Deletion workflow.
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <ThemedButton title="Close" variant="primary" onPress={onClose} />
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
    marginBottom: Spacing.sm,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: Radius.xs,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentScroll: {
    maxHeight: 380,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  docBody: {
    paddingBottom: Spacing.lg,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  para: {
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  footer: {
    paddingTop: Spacing.sm,
    borderTopWidth: Borders.thin,
    borderColor: 'rgba(0,0,0,0.06)',
  },
});
