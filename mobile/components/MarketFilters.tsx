import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export type MarketStatusFilter = 'active' | 'expired' | 'resolved';

interface MarketFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatuses: MarketStatusFilter[];
  onStatusToggle: (status: MarketStatusFilter) => void;
  showMyBets?: boolean;
  onMyBetsToggle?: () => void;
  hasMyBets?: boolean;
}

const STATUS_FILTERS: { key: MarketStatusFilter; label: string; icon: string }[] = [
  { key: 'active', label: 'Active', icon: 'flash-outline' },
  { key: 'expired', label: 'Expired', icon: 'time-outline' },
  { key: 'resolved', label: 'Resolved', icon: 'checkmark-circle-outline' },
];

export function MarketFilters({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusToggle,
  showMyBets = false,
  onMyBetsToggle,
  hasMyBets = false,
}: MarketFiltersProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
        <Ionicons 
          name="search-outline" 
          size={18} 
          color={theme.colors.mutedForeground} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search markets..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={theme.colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {STATUS_FILTERS.map((filter) => {
          const isSelected = selectedStatuses.includes(filter.key);
          return (
            <Pressable
              key={filter.key}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onStatusToggle(filter.key)}
            >
              <Ionicons
                name={filter.icon as any}
                size={14}
                color={isSelected ? theme.colors.primaryForeground : theme.colors.mutedForeground}
              />
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}

        {/* My Bets Toggle */}
        {onMyBetsToggle && (
          <Pressable
            style={[
              styles.chip,
              styles.myBetsChip,
              showMyBets && styles.chipSelected,
            ]}
            onPress={onMyBetsToggle}
          >
            <Ionicons
              name="diamond-outline"
              size={14}
              color={showMyBets ? theme.colors.primaryForeground : theme.colors.mutedForeground}
            />
            <Text style={[
              styles.chipText,
              showMyBets && styles.chipTextSelected,
            ]}>
              My Bets
            </Text>
            {hasMyBets && !showMyBets && (
              <View style={styles.betIndicator} />
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// Hook for managing filter state
export function useMarketFilters(defaultStatuses: MarketStatusFilter[] = ['active', 'expired']) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<MarketStatusFilter[]>(defaultStatuses);
  const [showMyBets, setShowMyBets] = useState(false);

  const toggleStatus = useCallback((status: MarketStatusFilter) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        // Don't allow deselecting all statuses
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
  }, []);

  const toggleMyBets = useCallback(() => {
    setShowMyBets(prev => !prev);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    selectedStatuses,
    toggleStatus,
    showMyBets,
    toggleMyBets,
  };
}

// Utility function to filter markets
interface MarketForFilter {
  id: string;
  title: string;
  description: string;
  status: string;
  resolutionDate: string;
  _count?: { bets: number };
}

export function filterMarkets<T extends MarketForFilter>(
  markets: T[],
  searchQuery: string,
  selectedStatuses: MarketStatusFilter[],
  userBetMarketIds?: Set<string>,
  showMyBets?: boolean
): T[] {
  const now = new Date();
  const query = searchQuery.toLowerCase().trim();

  return markets.filter(market => {
    // Search filter
    if (query) {
      const titleMatch = market.title.toLowerCase().includes(query);
      const descMatch = market.description.toLowerCase().includes(query);
      if (!titleMatch && !descMatch) return false;
    }

    // My Bets filter
    if (showMyBets && userBetMarketIds) {
      if (!userBetMarketIds.has(market.id)) return false;
    }

    // Status filter
    const isResolved = market.status === 'RESOLVED';
    const resolutionDate = new Date(market.resolutionDate);
    const isExpired = resolutionDate < now && !isResolved;
    const isActive = !isResolved && !isExpired;

    const statusMatches = selectedStatuses.some(status => {
      switch (status) {
        case 'active': return isActive;
        case 'expired': return isExpired;
        case 'resolved': return isResolved;
        default: return false;
      }
    });

    return statusMatches;
  });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  myBetsChip: {
    marginLeft: theme.spacing.sm,
    borderStyle: 'dashed',
  },
  chipText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.mutedForeground,
  },
  chipTextSelected: {
    color: theme.colors.background,
  },
  betIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
});

