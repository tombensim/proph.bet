
import { fetchPolymarketMarkets } from "../lib/polymarket-service";

async function testFetch() {
  console.log("Testing fetchPolymarketMarkets...");
  try {
    const markets = await fetchPolymarketMarkets({ limit: 5, closed: false });
    console.log(`Successfully fetched ${markets.length} markets.`);
    
    if (markets.length > 0) {
      const first = markets[0];
      console.log("Sample Market:", {
        id: first.id,
        question: first.question,
        outcomes: first.outcomes,
        prices: first.outcomePrices,
        volume: first.volume,
        endDate: first.endDate
      });
      
      // Validation
      if (!first.question || !first.outcomes || !first.outcomePrices) {
        console.error("FAILED: Missing required fields in market data.");
      } else {
        console.log("SUCCESS: Data structure appears valid.");
      }
    } else {
      console.warn("WARNING: No markets returned (API might be empty or filtered too heavily).");
    }
  } catch (error) {
    console.error("FAILED: Error fetching markets:", error);
  }
}

testFetch();
