/**
 * Automated Market Maker (AMM) calculations
 * 
 * This module implements Constant Product Market Maker (CPMM) logic
 * for prediction market pricing and share calculations.
 * 
 * The CPMM maintains the invariant: k = product of all pool liquidities
 * When a user bets on an option, they add liquidity to all OTHER pools
 * and receive shares from the target pool.
 */

export interface PoolState {
  optionId: string
  liquidity: number
}

export interface TradeResult {
  shares: number
  newPools: PoolState[]
  priceImpact: number
}

export interface ProbabilityResult {
  optionId: string
  probability: number
  liquidity: number
}

/**
 * Calculate the implied probability for each option based on pool liquidities.
 * Uses the inverse liquidity formula: P(option) = (1/liquidity) / sum(1/all_liquidities)
 * 
 * @param pools - Array of pool states with optionId and liquidity
 * @returns Array of probability results for each option
 */
export function calculateProbabilities(pools: PoolState[]): ProbabilityResult[] {
  if (pools.length === 0) return []
  
  const inverseSum = pools.reduce((sum, p) => sum + (1 / (p.liquidity || 1)), 0)
  
  if (inverseSum === 0) {
    return pools.map(p => ({
      optionId: p.optionId,
      probability: 1 / pools.length,
      liquidity: p.liquidity
    }))
  }
  
  return pools.map(p => ({
    optionId: p.optionId,
    probability: (1 / (p.liquidity || 1)) / inverseSum,
    liquidity: p.liquidity
  }))
}

/**
 * Calculate the implied probability for a single option.
 * 
 * @param pools - Array of all pool states
 * @param optionId - The option to get probability for
 * @returns The probability (0-1) or 0 if option not found
 */
export function calculateProbability(pools: PoolState[], optionId: string): number {
  const probabilities = calculateProbabilities(pools)
  const result = probabilities.find(p => p.optionId === optionId)
  return result?.probability ?? 0
}

/**
 * Calculate the shares received for a CPMM trade.
 * 
 * In CPMM:
 * 1. User's bet amount is added to all OTHER pools' liquidity
 * 2. The target pool's liquidity decreases to maintain k = product of all pools
 * 3. User receives shares = bet_amount + liquidity_decrease
 * 
 * @param pools - Current pool states
 * @param targetOptionId - The option being bet on
 * @param betAmount - Amount being bet (after any fees)
 * @returns Trade result with shares, new pool states, and price impact
 */
export function calculateCPMMTrade(
  pools: PoolState[],
  targetOptionId: string,
  betAmount: number
): TradeResult {
  const targetPool = pools.find(p => p.optionId === targetOptionId)
  if (!targetPool) {
    throw new Error("Option not found in pools")
  }

  if (betAmount <= 0) {
    throw new Error("Bet amount must be positive")
  }

  // Calculate k (product of all pool liquidities)
  const k = pools.reduce((acc, p) => acc * p.liquidity, 1)
  
  // Separate target from other pools
  const otherPools = pools.filter(p => p.optionId !== targetOptionId)
  
  // Add bet amount to all other pools
  const newOtherPools = otherPools.map(p => ({
    ...p,
    liquidity: p.liquidity + betAmount
  }))
  
  // Calculate new product of other pools
  const newOtherProduct = newOtherPools.reduce((acc, p) => acc * p.liquidity, 1)
  
  // New target liquidity = k / product(other_pools)
  const newTargetLiquidity = k / newOtherProduct
  
  // Shares = bet_amount + (old_target_liquidity - new_target_liquidity)
  const swappedShares = targetPool.liquidity - newTargetLiquidity
  const shares = betAmount + swappedShares
  
  // Calculate price impact (how much the target pool decreased)
  const priceImpact = swappedShares / targetPool.liquidity
  
  return {
    shares,
    newPools: [
      ...newOtherPools,
      { optionId: targetOptionId, liquidity: newTargetLiquidity }
    ],
    priceImpact
  }
}

/**
 * Calculate the estimated payout for a bet given the current probability.
 * 
 * @param betAmount - Amount being bet
 * @param probability - Current probability of the option
 * @param feePercent - Fee percentage (0-1, e.g., 0.02 for 2%)
 * @returns Estimated payout details
 */
export function calculateEstimatedPayout(
  betAmount: number,
  probability: number,
  feePercent: number = 0
): { payout: number; profit: number; percentReturn: number; fee: number } {
  if (probability <= 0 || probability >= 1) {
    return { payout: 0, profit: 0, percentReturn: 0, fee: 0 }
  }
  
  const fee = Math.floor(betAmount * feePercent)
  const netInvestment = betAmount - fee
  const payout = Math.floor(netInvestment / probability)
  const profit = payout - betAmount
  const percentReturn = Math.round((profit / betAmount) * 100)
  
  return { payout, profit, percentReturn, fee }
}

/**
 * Calculate payouts for winning bets in market resolution.
 * 
 * @param totalPayoutPool - Total pool to distribute
 * @param winningBets - Array of winning bets with their shares/amounts
 * @param useShares - If true, distribute by shares; if false, by bet amounts
 * @returns Map of userId to payout amount
 */
export function calculateResolutionPayouts(
  totalPayoutPool: number,
  winningBets: Array<{ userId: string; shares: number; amount: number }>,
  useShares: boolean = true
): Map<string, number> {
  const payouts = new Map<string, number>()
  
  if (winningBets.length === 0 || totalPayoutPool <= 0) {
    return payouts
  }
  
  const totalWeight = winningBets.reduce(
    (sum, bet) => sum + (useShares ? bet.shares : bet.amount),
    0
  )
  
  if (totalWeight <= 0) {
    return payouts
  }
  
  for (const bet of winningBets) {
    const weight = useShares ? bet.shares : bet.amount
    const share = weight / totalWeight
    const payout = Math.floor(share * totalPayoutPool)
    
    if (payout > 0) {
      const currentPayout = payouts.get(bet.userId) || 0
      payouts.set(bet.userId, currentPayout + payout)
    }
  }
  
  return payouts
}

/**
 * Determine which numeric range bucket a value falls into.
 * 
 * @param value - The winning value
 * @param options - Array of options with text in "min - max" format
 * @returns The optionId of the matching bucket, or null if not found
 */
export function findWinningNumericBucket(
  value: number,
  options: Array<{ id: string; text: string }>
): string | null {
  // Sort options by min value
  const sortedOptions = [...options].sort((a, b) => {
    const minA = parseFloat(a.text.split(" - ")[0])
    const minB = parseFloat(b.text.split(" - ")[0])
    return minA - minB
  })
  
  for (let i = 0; i < sortedOptions.length; i++) {
    const opt = sortedOptions[i]
    const parts = opt.text.split(" - ")
    
    if (parts.length === 2) {
      const min = parseFloat(parts[0])
      const max = parseFloat(parts[1])
      const isLast = i === sortedOptions.length - 1
      
      // Check bounds: [min, max) for all except last which is [min, max]
      if (value >= min && (value < max || (isLast && value <= max))) {
        return opt.id
      }
    }
  }
  
  return null
}

