import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTimerStore } from '@/store/timerStore';
import { formatDuration } from '@/utils/duration';
import {
  cancelTimerNotification,
  scheduleTimerNotification,
} from '@/utils/notifications';
import { useThemeColors, fontSizes, radii } from '@/theme';
import type { ThemeColors } from '@/theme';

interface TimersPanelProps {
  embedded?: boolean;
}

export default function TimersPanel({ embedded = false }: TimersPanelProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const timers = useTimerStore((state) => state.timers);
  const tick = useTimerStore((state) => state.tick);
  const pauseTimer = useTimerStore((state) => state.pauseTimer);
  const resumeTimer = useTimerStore((state) => state.resumeTimer);
  const resetTimer = useTimerStore((state) => state.resetTimer);
  const addTime = useTimerStore((state) => state.addTime);
  const removeTimer = useTimerStore((state) => state.removeTimer);
  const setNotificationId = useTimerStore((state) => state.setNotificationId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const completed = tick();
      completed.forEach((timer) => {
        Alert.alert('Timer finished', `${timer.label} is ready.`);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const handlePause = async (id: string) => {
    const timer = timers.find((item) => item.id === id);
    pauseTimer(id);
    await cancelTimerNotification(timer?.notificationId ?? null);
    setNotificationId(id, null);
  };

  const handleResume = async (id: string) => {
    const timer = timers.find((item) => item.id === id);
    resumeTimer(id);
    await cancelTimerNotification(timer?.notificationId ?? null);
    if (timer) {
      const notificationId = await scheduleTimerNotification(timer.label, timer.remainingSeconds);
      setNotificationId(id, notificationId);
    }
  };

  const handleReset = async (id: string) => {
    const timer = timers.find((item) => item.id === id);
    await cancelTimerNotification(timer?.notificationId ?? null);
    resetTimer(id);
    if (timer) {
      const notificationId = await scheduleTimerNotification(timer.label, timer.durationSeconds);
      setNotificationId(id, notificationId);
    }
  };

  const handleRemove = async (id: string) => {
    const timer = timers.find((item) => item.id === id);
    await cancelTimerNotification(timer?.notificationId ?? null);
    removeTimer(id);
  };

  const handleAddTime = async (id: string) => {
    const timer = timers.find((item) => item.id === id);
    if (!timer) return;
    await cancelTimerNotification(timer.notificationId);
    addTime(id, 60);
    const updated = useTimerStore.getState().timers.find((item) => item.id === id);
    if (updated && !updated.completed && !updated.paused) {
      const seconds = Math.max(1, Math.ceil(((updated.endAt ?? Date.now()) - Date.now()) / 1000));
      const notificationId = await scheduleTimerNotification(updated.label, seconds);
      setNotificationId(id, notificationId);
    } else {
      setNotificationId(id, null);
    }
  };

  const content = (
    <View style={embedded ? s.embeddedContent : s.modalContent}>
      <View style={s.panelHeader}>
        <View>
          <Text style={s.panelTitle}>Cooking Timers</Text>
          <Text style={s.panelSubtitle}>{timers.length} active or completed</Text>
        </View>
        {!embedded ? (
          <TouchableOpacity
            style={s.cookingModeButton}
            onPress={() => {
              setVisible(false);
              router.push('/cooking-mode');
            }}
          >
            <Text style={s.cookingModeText}>Cooking Mode</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {timers.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No timers yet</Text>
          <Text style={s.emptyText}>Tap a duration in recipe instructions to start one.</Text>
        </View>
      ) : (
        timers.map((timer) => (
          <View key={timer.id} style={[s.timerCard, timer.completed && s.completedCard]}>
            <View style={s.timerTopRow}>
              <View style={s.timerIdentity}>
                <Text style={s.timerLabel}>{timer.label}</Text>
                <Text style={s.timerRecipe} numberOfLines={1}>{timer.recipeTitle}</Text>
              </View>
              <Text style={[s.timerTime, timer.completed && s.completedTime]}>
                {formatDuration(timer.remainingSeconds)}
              </Text>
            </View>
            <View style={s.timerActions}>
              {timer.completed ? (
                <TouchableOpacity style={s.actionButton} onPress={() => handleReset(timer.id)}>
                  <Text style={s.actionText}>Restart</Text>
                </TouchableOpacity>
              ) : timer.paused ? (
                <TouchableOpacity style={s.actionButton} onPress={() => handleResume(timer.id)}>
                  <Text style={s.actionText}>Resume</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.actionButton} onPress={() => handlePause(timer.id)}>
                  <Text style={s.actionText}>Pause</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionButton} onPress={() => handleReset(timer.id)}>
                <Text style={s.actionText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionButton} onPress={() => handleAddTime(timer.id)}>
                <Text style={s.actionText}>+1 min</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.removeButton} onPress={() => handleRemove(timer.id)}>
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (embedded) return content;

  return (
    <>
      {timers.length > 0 ? (
        <TouchableOpacity style={s.floatingButton} onPress={() => setVisible(true)} activeOpacity={0.8}>
          <Text style={s.floatingCount}>{timers.filter((timer) => !timer.completed).length}</Text>
          <Text style={s.floatingText}>Timers</Text>
        </TouchableOpacity>
      ) : null}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalShell}>
            <TouchableOpacity
              style={s.closeButton}
              onPress={() => setVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close timers"
            >
              <Text style={s.closeText}>Close</Text>
            </TouchableOpacity>
            {content}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      right: 18,
      bottom: Platform.OS === 'web' ? 24 : 30,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.bgButton,
      borderRadius: radii.full,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    floatingCount: {
      width: 24,
      height: 24,
      borderRadius: 12,
      textAlign: 'center',
      lineHeight: 24,
      overflow: 'hidden',
      backgroundColor: colors.success,
      color: colors.white,
      fontWeight: '800',
    },
    floatingText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '700' },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalShell: {
      maxHeight: '82%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingBottom: 24,
    },
    closeButton: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 12 },
    closeText: { color: colors.textLight, fontWeight: '700' },
    modalContent: { paddingHorizontal: 18, paddingBottom: 12 },
    embeddedContent: { paddingHorizontal: 18, paddingVertical: 18, gap: 12 },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    panelTitle: { color: colors.textDark, fontSize: fontSizes['2xl'], fontWeight: '800' },
    panelSubtitle: { color: colors.textLight, marginTop: 2 },
    cookingModeButton: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    cookingModeText: { color: colors.text, fontSize: fontSizes.sm, fontWeight: '700' },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 30,
      borderRadius: radii.lg,
      backgroundColor: colors.bgSubtle,
    },
    emptyTitle: { color: colors.textDark, fontSize: fontSizes.lg, fontWeight: '700' },
    emptyText: { color: colors.textLight, marginTop: 6, textAlign: 'center', maxWidth: 280 },
    timerCard: {
      backgroundColor: colors.sidebarBg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 14,
      marginBottom: 10,
    },
    completedCard: { borderColor: colors.success },
    timerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    timerIdentity: { flex: 1 },
    timerLabel: { color: colors.textDark, fontSize: fontSizes.base, fontWeight: '800' },
    timerRecipe: { color: colors.textLight, marginTop: 2 },
    timerTime: { color: colors.textDark, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] as never },
    completedTime: { color: colors.success },
    timerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    actionButton: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    actionText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
    removeButton: { paddingHorizontal: 10, paddingVertical: 7 },
    removeText: { color: colors.error, fontWeight: '700', fontSize: fontSizes.sm },
  });
