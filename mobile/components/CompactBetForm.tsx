import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { usePlaceBet } from '@/hooks/useBets';
import { theme } from '@/lib/theme';

interface Option {
  id: string;
  text: string;
  liquidity: number;
}

interface CompactBetFormProps {
  marketId: string;
  option: Option;
  side: 'yes' | 'no';
  allOptions: Option[];
  userPoints: number;
  feePercent: number;
  minBet?: number;
  maxBet?: number;
  coverImage?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompactBetForm({
  marketId,
  option,
  side,
  allOptions,
  userPoints,
  feePercent,
  minBet = 10,
  maxBet,
  coverImage,
  onClose,
  onSuccess,
}: CompactBetFormProps) {
  const [amount, setAmount] = useState(minBet);
  const [success, setSuccess] = useState(false);
  const placeBetMutation = usePlaceBet();

  const effectiveMax = maxBet ? Math.min(maxBet, userPoints) : userPoints;

  // Calculate potential return
  const potentialReturn = useMemo(() => {
    if (!amount || amount <= 0) return null;

    const inverseSum = allOptions.reduce(
      (sum, o) => sum + 1 / (o.liquidity || 100),
      0
    );
    const prob =
      inverseSum === 0 ? 0 : (1 / (option.liquidity || 100)) / inverseSum;

    if (prob > 0) {
      const fee = Math.floor(amount * feePercent);
      const netInvestment = amount - fee;
      const payout = Math.floor(netInvestment / prob);
      return { payout, fee };
    }
    return null;
  }, [amount, option.liquidity, allOptions, feePercent]);

  const handleAmountChange = (value: number) => {
    const clamped = Math.min(Math.max(minBet, Math.round(value)), effectiveMax);
    setAmount(clamped);
  };

  const handleSubmit = async () => {
    if (amount <= 0 || amount > userPoints) return;

    try {
      await placeBetMutation.mutateAsync({
        marketId,
        amount,
        optionId: option.id,
        idempotencyKey: `${marketId}-${Date.now()}`,
      });
      setSuccess(true);

      // Show success briefly then close
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isYes = side === 'yes';
  const buttonColor = isYes ? theme.colors.success : theme.colors.destructive;

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Image
            source={require('@/assets/images/favicon.png')}
            style={styles.successImage}
            resizeMode="contain"
          />
          <View style={styles.successTextContainer}>
            <Text style={styles.successTitle}>Bet placed!</Text>
            <Text style={styles.successSubtitle}>Good luck!</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with option and close button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {coverImage && (
            <Image
              source={{ uri: coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}
          <Text style={styles.optionText} numberOfLines={1}>
            {option.text}
          </Text>
        </View>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Amount Input with quick add buttons */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.input}
            value={amount.toString()}
            onChangeText={(text) => handleAmountChange(parseInt(text, 10) || 0)}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => handleAmountChange(amount + 1)}
          disabled={amount >= effectiveMax}
        >
          <Text style={styles.quickAddText}>+1</Text>
        </Pressable>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => handleAmountChange(amount + 10)}
          disabled={amount >= effectiveMax}
        >
          <Text style={styles.quickAddText}>+10</Text>
        </Pressable>
        <Slider
          style={styles.slider}
          minimumValue={minBet}
          maximumValue={effectiveMax}
          value={amount}
          onValueChange={handleAmountChange}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.muted}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      {/* Balance indicator */}
      <Text style={styles.balanceText}>Balance: {userPoints} pts</Text>

      {/* Error message */}
      {placeBetMutation.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {placeBetMutation.error instanceof Error
              ? placeBetMutation.error.message
              : 'Failed to place bet'}
          </Text>
        </View>
      )}

      {/* Submit button */}
      <Pressable
        style={[
          styles.submitButton,
          { backgroundColor: buttonColor },
          (placeBetMutation.isPending ||
            amount <= 0 ||
            amount > userPoints) &&
            styles.disabledButton,
        ]}
        onPress={handleSubmit}
        disabled={
          placeBetMutation.isPending || amount <= 0 || amount > userPoints
        }
      >
        {placeBetMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.submitContent}>
            <Text style={styles.submitText}>Buy {isYes ? 'Yes' : 'No'}</Text>
            {potentialReturn && (
              <Text style={styles.submitSubtext}>
                To win ${potentialReturn.payout}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  coverImage: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minWidth: 80,
  },
  currencySymbol: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.mutedForeground,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    minWidth: 40,
  },
  quickAddButton: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  quickAddText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  balanceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: theme.colors.destructiveLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.destructive,
  },
  submitButton: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitContent: {
    alignItems: 'center',
  },
  submitText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  submitSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  successImage: {
    width: 48,
    height: 48,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  successSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    opacity: 0.8,
  },
});

