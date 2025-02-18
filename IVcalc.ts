// Black-Scholes implementation
function normalCDF(x: number) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * x);
  const erf =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * erf);
}

function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: OptionType = 'call'
) {
  const d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (optionType === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

function impliedVolatility(
  targetPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  optionType: OptionType = 'call',
  precision = 0.00001
) {
  let sigmaLow = 0.0001;
  let sigmaHigh = 5.0; // 500% volatility as upper bound
  let sigmaMid;

  while (sigmaHigh - sigmaLow > precision) {
    sigmaMid = (sigmaLow + sigmaHigh) / 2;
    const price = blackScholes(S, K, T, r, sigmaMid, optionType);

    if (Math.abs(price - targetPrice) < precision) {
      return sigmaMid;
    }

    if (price > targetPrice) {
      sigmaHigh = sigmaMid;
    } else {
      sigmaLow = sigmaMid;
    }
  }

  return (sigmaLow + sigmaHigh) / 2;
}

async function processOptionsChain(data: StrikeData[]): Promise<IVResult[]> {
  const results: IVResult[] = [];

  // Fetch current price from Odos API
  const response = await fetch(
    'https://api.odos.xyz/pricing/token/146/0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38'
  );
  const priceData = await response.json();
  const currentPrice = priceData.price;

  const riskFreeRate = 0.05;
  const daysToExpiry = 7;
  const T = daysToExpiry / 365;

  // Process each strike in the chain
  data.forEach((strikeData) => {
    const strike = Object.keys(strikeData)[0];
    const pools = strikeData[strike];

    pools.forEach((pool) => {
      try {
        if (!pool.totalLiquidity) return;

        // Convert totalLiquidity to proper decimal format
        const marketPrice = parseFloat(pool.totalLiquidity) / 1e18;

        const iv = impliedVolatility(
          marketPrice,
          currentPrice,
          parseFloat(strike),
          T,
          riskFreeRate,
          parseFloat(strike) > currentPrice ? 'call' : 'put'
        );

        results.push({
          strike: parseFloat(strike),
          impliedVolatility: iv * 100, // Convert to percentage
          liquidity: pool.totalLiquidity,
          utilization: pool.utilization,
          apr: pool.apr,
        });
      } catch (error) {
        console.error(`Error processing strike ${strike}:`, error);
      }
    });
  });

  // Sort results by strike price
  results.sort((a, b) => a.strike - b.strike);

  console.log(`\nCurrent Price: $${currentPrice.toFixed(4)}`);
  console.log(`Time Frame: ${daysToExpiry} days\n`);

  // Find highest APR and utilization
  const bestYield = results.reduce((max, curr) =>
    parseFloat(curr.apr) > parseFloat(max.apr) ? curr : max
  );

  // Calculate strike range for positions with APR > 0
  const strikesWithApr = results.filter(r => parseFloat(r.apr) > 0);
  const strikeRange = {
    min: Math.min(...strikesWithApr.map(r => r.strike)),
    max: Math.max(...strikesWithApr.map(r => r.strike))
  };

  console.log('Yield Opportunities:');
  console.log(`Strike Range with APR: $${strikeRange.min.toFixed(4)} - $${strikeRange.max.toFixed(4)}`);
  console.log(`Best Strike: $${bestYield.strike.toFixed(4)} (${bestYield.apr}%)`);
  console.log(`Utilization: ${bestYield.utilization}%\n`);

  // Analyze trading direction bias
  const putVolume = results
    .filter((r) => r.strike < currentPrice)
    .reduce((sum, r) => sum + parseFloat(r.utilization), 0);
  const callVolume = results
    .filter((r) => r.strike > currentPrice)
    .reduce((sum, r) => sum + parseFloat(r.utilization), 0);

  console.log('Market Direction Bias:');
  console.log(`Put/Call Ratio: ${(putVolume / callVolume).toFixed(2)}`);
  console.log(
    `Traders are primarily ${putVolume > callVolume ? 'hedging downside' : 'betting on upside'
    }\n`
  );

  // Expected price range (based on highest IV within 20% of current price)
  const nearMoneyOptions = results.filter(
    (r) => r.strike > currentPrice * 0.8 && r.strike < currentPrice * 1.2
  );
  const maxIV = Math.max(...nearMoneyOptions.map((r) => r.impliedVolatility));
  const weeklyMove = currentPrice * (maxIV / 100) * Math.sqrt(7 / 365);

  console.log('Expected Price Movement (This Week):');
  console.log(`Upper: $${(currentPrice + weeklyMove).toFixed(4)}`);
  console.log(`Lower: $${(currentPrice - weeklyMove).toFixed(4)}`);

  return results;
}

async function runWithInterval() {
  console.clear(); // Clear terminal before each update
  console.log('Stryke Options Analytics\n');
  console.log('Asset: Wrapped Sonic ($wS)\n');

  try {
    // Fetch data from API
    const response = await fetch(
      'https://api.stryke.xyz/clamm/strikes-chain?optionMarket=0x342e4068bA07bbCcBDDE503b2451FAa3D3C0278B&chainId=146&callsReach=200&putsReach=200'
    );
    const data = await response.json();

    // Process the options chain
    const results = await processOptionsChain(data);

    // Get current timestamp
    const now = new Date().toLocaleTimeString();
    console.log(`Last Update: ${now}\n`);

    // Print results in a more condensed format
    console.log('Strike    IV%    Util%    APR%');
    console.log('--------------------------------');
    results.forEach((result) => {
      if (result.utilization !== '0') {
        // Only show strikes with utilization
        console.log(
          `${result.strike.toFixed(4).padEnd(9)} ` +
          `${result.impliedVolatility.toFixed(2).padStart(5)}  ` +
          `${result.utilization.padStart(6)}  ` +
          `${result.apr.padStart(6)}`
        );
      }
    });
  } catch (error) {
    console.log('Fetching data...\n');
    console.error('Error:', error);
  }
}

// Run the program with 30-second intervals
async function main() {
  while (true) {
    await runWithInterval();
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping analytics...');
  process.exit();
});

// Start the program
main();

// Option types
export type OptionType = 'call' | 'put';

// Pool data from API
export interface Pool {
  totalLiquidity: string;
  availableLiquidity: string;
  utilization: string;
  apr: string;
  handler: {
    deprecated: boolean;
    handler: string;
    name: string;
    pool: string;
  };
  meta: {
    hook: string;
    tickLower: number;
    tickUpper: number;
    totalTokenLiquidity: string;
    availableTokenLiquidity: string;
    totalLiquidity: string;
    availableLiquidity: string;
  };
  token: {
    address: string;
    decimals: number;
    symbol: string;
  };
}

// Strike data from API
export interface StrikeData {
  [strike: string]: Pool[];
}

// Processed result
export interface IVResult {
  strike: number;
  impliedVolatility: number;
  liquidity: string;
  utilization: string;
  apr: string;
}

// Function interfaces
export interface BlackScholesParams {
  S: number; // Current price
  K: number; // Strike price
  T: number; // Time to expiration (in years)
  r: number; // Risk-free rate
  sigma: number; // Volatility
  optionType?: OptionType;
}

export interface ImpliedVolatilityParams {
  targetPrice: number;
  S: number;
  K: number;
  T: number;
  r: number;
  optionType?: OptionType;
  precision?: number;
}

// Function signatures
export interface IVCalculator {
  normalCDF(x: number): number;
  blackScholes(params: BlackScholesParams): number;
  impliedVolatility(params: ImpliedVolatilityParams): number;
  processOptionsChain(data: StrikeData[]): IVResult[];
}

// Configuration interface
export interface IVConfig {
  currentPrice: number;
  riskFreeRate: number;
  daysToExpiry: number;
}
