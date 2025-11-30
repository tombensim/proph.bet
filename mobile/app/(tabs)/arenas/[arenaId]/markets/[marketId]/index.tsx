import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMarket } from '@/hooks/useMarkets';
import { usePlaceBet } from '@/hooks/useBets';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';

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
  const isExpired = resolutionDate < new Date();
  const canBet = !isResolved && !isExpired;

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
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Market' }} />

      <View style={styles.header}>
        <View
          style={[
            styles.statusBadge,
            isResolved ? styles.resolved : isExpired ? styles.expired : styles.open,
          ]}
        >
          <Text style={styles.statusText}>
            {isResolved ? 'Resolved' : isExpired ? 'Pending Resolution' : 'Open'}
          </Text>
        </View>
        <Text style={styles.title}>{market.title}</Text>
        {market.description && (
          <Text style={styles.description}>{market.description}</Text>
        )}
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text style={styles.metaText}>
            Resolves {format(resolutionDate, 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

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
                <Text style={styles.optionText}>{option.text}</Text>
                {isWinner && (
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                )}
              </View>
              <View style={styles.probabilityContainer}>
                <View
                  style={[
                    styles.probabilityBar,
                    { width: `${probability}%` },
                    isWinner && styles.winnerBar,
                  ]}
                />
                <Text style={styles.probabilityText}>
                  {probability.toFixed(1)}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {canBet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Place Bet</Text>
          <View style={styles.betForm}>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={betAmount}
              onChangeText={setBetAmount}
            />
            <Pressable
              style={[
                styles.betButton,
                (!selectedOption || !betAmount) && styles.disabled,
              ]}
              onPress={handlePlaceBet}
              disabled={!selectedOption || !betAmount || placeBetMutation.isPending}
            >
              <Text style={styles.betButtonText}>
                {placeBetMutation.isPending ? 'Placing...' : 'Place Bet'}
              </Text>
            </Pressable>
          </View>
          {selectedOption && (
            <Text style={styles.selectedText}>
              Selected: {market.options.find((o: { id: string }) => o.id === selectedOption)?.text}
            </Text>
          )}
        </View>
      )}

      {market.bets && market.bets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Bets</Text>
          {market.bets.map((bet: { id: string; amount: number; shares: number; option: { text: string } }) => (
            <View key={bet.id} style={styles.betCard}>
              <Text style={styles.betOption}>{bet.option?.text}</Text>
              <View style={styles.betDetails}>
                <Text style={styles.betAmount}>{bet.amount} pts</Text>
                <Text style={styles.betShares}>{bet.shares.toFixed(2)} shares</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  open: { backgroundColor: '#22c55e20' },
  resolved: { backgroundColor: '#6366f120' },
  expired: { backgroundColor: '#f59e0b20' },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#6366f1',
  },
  winnerOption: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e10',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  probabilityContainer: {
    height: 24,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  probabilityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
    opacity: 0.3,
  },
  winnerBar: {
    backgroundColor: '#22c55e',
  },
  probabilityText: {
    position: 'absolute',
    right: 8,
    top: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  betForm: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  betButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  betButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6366f1',
  },
  betCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  betOption: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  betDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  betAmount: {
    fontSize: 14,
    color: '#6366f1',
  },
  betShares: {
    fontSize: 14,
    color: '#64748b',
  },
});
