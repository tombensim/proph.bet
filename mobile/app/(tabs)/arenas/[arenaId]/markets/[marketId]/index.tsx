import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMarket } from '@/hooks/useMarkets';
import { usePlaceBet } from '@/hooks/useBets';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format } from 'date-fns';
import { generateGradientColors } from '@proph-bet/shared/utils';
import { theme } from '@/lib/theme';

export default function MarketScreen() {
  const { marketId, arenaId } = useLocalSearchParams<{
    marketId: string;
    arenaId: string;
  }>();
  const { data: market, isLoading } = useMarket(marketId);
  const placeBetMutation = usePlaceBet();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState('');

  if (isLoading || !market) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isResolved = market.status === 'RESOLVED';
  const resolutionDate = new Date(market.resolutionDate);
  const isExpired = resolutionDate < new Date() && !isResolved;
  const canBet = !isResolved && !isExpired;
  const coverImage = market.assets?.find((a: { type: string }) => a.type === 'IMAGE')?.url;
  const gradient = generateGradientColors(market.id);

  function calculateProbability(optionLiquidity: number) {
    const inverseSum = market.options.reduce(
      (sum: number, o: { liquidity: number }) => sum + 1 / o.liquidity,
      0
    );
    return ((1 / optionLiquidity) / inverseSum) * 100;
  }

  async function handlePlaceBet() {
    if (!selectedOption || !betAmount) {
      Alert.alert('Error', 'Please select an option and enter an amount');
      return;
    }

    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await placeBetMutation.mutateAsync({
        marketId,
        amount,
        optionId: selectedOption,
        idempotencyKey: `${marketId}-${Date.now()}`,
      });

      Alert.alert('Success', 'Bet placed successfully!');
      setSelectedOption(null);
      setBetAmount('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to place bet'
      );
    }
  }

  return (
    <ScrollView style={styles.container} bounces={false}>
      <Stack.Screen 
        options={{ 
          title: '',
          headerTransparent: true,
          headerTintColor: theme.colors.foreground,
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }} 
      />

      {/* Cover Image or Gradient Header */}
      {coverImage ? (
        <Image 
          source={{ uri: coverImage }} 
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={gradient.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverGradient}
        />
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          isResolved ? styles.resolvedBadge : isExpired ? styles.expiredBadge : styles.openBadge
        ]}>
          <Text style={[
            styles.statusText,
            isResolved ? styles.resolvedText : isExpired ? styles.expiredText : styles.openText
          ]}>
            {isResolved ? 'Resolved' : isExpired ? 'Pending Resolution' : 'Open'}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{market.title}</Text>
        
        {/* Description */}
        {market.description && (
          <Text style={styles.description}>{market.description}</Text>
        )}

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.mutedForeground} />
            <Text style={styles.metaText}>
              Resolves {format(resolutionDate, 'MMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={theme.colors.mutedForeground} />
            <Text style={styles.metaText}>
              {market.creator?.name || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          {market.options.map((option: { id: string; text: string; liquidity: number }) => {
            const probability = calculateProbability(option.liquidity);
            const isWinner = market.winningOptionId === option.id;
            const isSelected = selectedOption === option.id;

            return (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  isWinner && styles.winnerOption,
                  isSelected && styles.selectedOption,
                ]}
                onPress={() => canBet && setSelectedOption(option.id)}
                disabled={!canBet}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    {canBet && (
                      <View style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected
                      ]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    )}
                    <Text style={styles.optionText}>{option.text}</Text>
                  </View>
                  <View style={styles.optionRight}>
                    {isWinner && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    )}
                    <Text style={[
                      styles.probabilityText,
                      isWinner && styles.winnerProbability
                    ]}>
                      {probability.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.probabilityBarContainer}>
                  <View
                    style={[
                      styles.probabilityBar,
                      { width: `${probability}%` },
                      isWinner && styles.winnerBar,
                      isSelected && styles.selectedBar,
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Place Bet Section */}
        {canBet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Place Bet</Text>
            <View style={styles.betForm}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  placeholderTextColor={theme.colors.mutedForeground}
                  keyboardType="numeric"
                  value={betAmount}
                  onChangeText={setBetAmount}
                />
                <Text style={styles.inputSuffix}>pts</Text>
              </View>
              <Pressable
                style={[
                  styles.betButton,
                  (!selectedOption || !betAmount) && styles.disabled,
                ]}
                onPress={handlePlaceBet}
                disabled={!selectedOption || !betAmount || placeBetMutation.isPending}
              >
                <Ionicons name="flash" size={16} color={theme.colors.primaryForeground} />
                <Text style={styles.betButtonText}>
                  {placeBetMutation.isPending ? 'Placing...' : 'Place Bet'}
                </Text>
              </Pressable>
            </View>
            {selectedOption && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedLabel}>Selected:</Text>
                <Text style={styles.selectedValue}>
                  {market.options.find((o: { id: string }) => o.id === selectedOption)?.text}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* User's Bets Section */}
        {market.bets && market.bets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Positions</Text>
            {market.bets.map((bet: { id: string; amount: number; shares: number; option: { text: string } }) => (
              <View key={bet.id} style={styles.betCard}>
                <View style={styles.betCardLeft}>
                  <Text style={styles.betOption}>{bet.option?.text}</Text>
                  <Text style={styles.betShares}>{bet.shares.toFixed(2)} shares</Text>
                </View>
                <View style={styles.betCardRight}>
                  <Text style={styles.betAmount}>{bet.amount} pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.fontSize.base,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  coverGradient: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: theme.spacing.lg,
    marginTop: -theme.spacing['2xl'],
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  openBadge: {
    backgroundColor: theme.colors.successLight,
  },
  resolvedBadge: {
    backgroundColor: theme.colors.indigoLight,
  },
  expiredBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  openText: {
    color: theme.colors.success,
  },
  resolvedText: {
    color: theme.colors.primary,
  },
  expiredText: {
    color: theme.colors.warning,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  section: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  optionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  selectedOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.indigoLight,
  },
  winnerOption: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
    flex: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  probabilityText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  winnerProbability: {
    color: theme.colors.success,
  },
  probabilityBarContainer: {
    height: 6,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  probabilityBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
    borderRadius: theme.borderRadius.full,
  },
  winnerBar: {
    backgroundColor: theme.colors.success,
    opacity: 0.5,
  },
  selectedBar: {
    backgroundColor: theme.colors.primary,
    opacity: 0.5,
  },
  betForm: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.base,
  },
  inputSuffix: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.fontSize.sm,
  },
  betButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  betButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  selectedLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  selectedValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  betCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  betCardLeft: {
    flex: 1,
  },
  betOption: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  betShares: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  betCardRight: {
    alignItems: 'flex-end',
  },
  betAmount: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
});
