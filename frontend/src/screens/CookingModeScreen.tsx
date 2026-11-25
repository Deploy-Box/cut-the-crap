import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import TimersPanel from '@/components/TimersPanel';
import { useRecipeStore } from '@/store/recipeStore';
import { useThemeColors, fontSizes, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

export default function CookingModeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const recipe = useRecipeStore((state) => state.result?.recipe);

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.title}>Cooking Mode</Text>
          {recipe?.title ? <Text style={s.recipeTitle} numberOfLines={1}>{recipe.title}</Text> : null}
        </View>
      </View>
      {recipe?.steps?.length ? (
        <View style={s.stepsPreview}>
          <Text style={s.stepsHeading}>Recipe Steps</Text>
          {recipe.steps.map((step, index) => (
            <Text key={index} style={s.stepText}>
              {index + 1}. {typeof step === 'string' ? step : step.instruction}
            </Text>
          ))}
        </View>
      ) : null}
      <TimersPanel embedded />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backText: { color: colors.text, fontWeight: '700' },
    headerTitle: { flex: 1 },
    title: { color: colors.textDark, fontSize: fontSizes['2xl'], fontWeight: '800' },
    recipeTitle: { color: colors.textLight, marginTop: 2 },
    stepsPreview: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    stepsHeading: { color: colors.textDark, fontSize: fontSizes.lg, fontWeight: '800', marginBottom: 8 },
    stepText: { color: colors.text, lineHeight: 21, marginBottom: 6 },
  });
