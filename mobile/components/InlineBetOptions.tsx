import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

interface Option {
  id: string;
  text: string;
  liquidity: number;
}

interface InlineBetOptionsProps {
  options: Option[];
  marketType: 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC_RANGE';
  onSelectBet: (optionId: string, side: 'yes' | 'no') => void;
  disabled?: boolean;
  coverImage?: string | null;
  isNew?: boolean;
}

export function InlineBetOptions({
  options,
  marketType,
  onSelectBet,
  disabled,
  coverImage,
  isNew,
}: InlineBetOptionsProps) {
  // Calculate probabilities using AMM formula
  const inverseSum = options.reduce(
    (sum, o) => sum + 1 / (o.liquidity || 100),
    0
  );
  const getProbability = (liquidity: number) => {
    if (inverseSum === 0) return 0;
    return (1 / (liquidity || 100)) / inverseSum;
  };

  // For binary markets, show a single row with Yes/No
  if (marketType === 'BINARY' && options.length === 2) {
    const yesOption = options.find((o) => o.text.toLowerCase() === 'yes');
    const noOption = options.find((o) => o.text.toLowerCase() === 'no');

    if (yesOption && noOption) {
      const total = yesOption.liquidity + noOption.liquidity;
      const yesPrice = noOption.liquidity / total;
      const yesPercent = Math.round(yesPrice * 100);

      return (
        <View style={styles.container}>
          <View style={styles.row}>
            <View style={styles.leftContent}>
              {coverImage && (
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.percentText}>{yesPercent}%</Text>
            </View>
            <View style={styles.buttonsContainer}>
              <Pressable
                style={[styles.yesButton, disabled && styles.disabledButton]}
                onPress={() => !disabled && onSelectBet(yesOption.id, 'yes')}
                disabled={disabled}
              >
                <Text style={styles.buttonText}>{yesPercent}%</Text>
              </Pressable>
              <Pressable
                style={[styles.noButton, disabled && styles.disabledButton]}
                onPress={() => !disabled && onSelectBet(noOption.id, 'no')}
                disabled={disabled}
              >
                <Text style={styles.buttonText}>No</Text>
              </Pressable>
            </View>
          </View>

          {isNew && (
            <View style={styles.newBadge}>
              <Ionicons name="sparkles" size={14} color={theme.colors.warning} />
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
        </View>
      );
    }
  }

  // Multiple choice / Multi-option markets
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const prob = getProbability(option.liquidity);
        const percent = Math.round(prob * 100);

        return (
          <View key={option.id} style={styles.row}>
            <View style={styles.leftContent}>
              {coverImage && index === 0 && (
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImageSmall}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.optionText} numberOfLines={1}>
                {option.text}
              </Text>
              <Text style={styles.percentTextSmall}>{percent}%</Text>
            </View>
            <View style={styles.buttonsContainer}>
              <Pressable
                style={[styles.yesButtonSmall, disabled && styles.disabledButton]}
                onPress={() => !disabled && onSelectBet(option.id, 'yes')}
                disabled={disabled}
              >
                <Text style={styles.buttonTextSmall}>{percent}%</Text>
              </Pressable>
              <Pressable
                style={[styles.noButtonSmall, disabled && styles.disabledButton]}
                onPress={() => !disabled && onSelectBet(option.id, 'no')}
                disabled={disabled}
              >
                <Text style={styles.buttonTextSmall}>No</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {isNew && (
        <View style={styles.newBadge}>
          <Ionicons name="sparkles" size={14} color={theme.colors.warning} />
          <Text style={styles.newText}>NEW</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  coverImage: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverImageSmall: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  percentText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
  },
  percentTextSmall: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
  },
  optionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  yesButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  yesButtonSmall: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  noButton: {
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  noButtonSmall: {
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  buttonTextSmall: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  newText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
  },
});

