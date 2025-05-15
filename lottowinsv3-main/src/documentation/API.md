# API Documentation

## Supabase Integration

### Authentication
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true
  }
});
```

### Data Models

#### Lottery
```typescript
interface Lottery {
  id: string;
  name: string;
  state_code: string;
  description: string | null;
  logo_url: string | null;
  draw_days: string[];
  created_at: string;
  updated_at: string;
}
```

#### LotteryDraw
```typescript
interface LotteryDraw {
  id: string;
  lottery_id: string;
  draw_date: string;
  jackpot_amount: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  lottery?: Lottery;
  numbers?: LotteryNumbers;
}
```

#### LotteryNumbers
```typescript
interface LotteryNumbers {
  id: string;
  draw_id: string;
  numbers: number[];
  special_numbers: number[];
  created_at: string;
}
```

### API Methods

#### Lotteries
```typescript
const api = {
  lotteries: {
    // Get all lotteries
    async getAll(): Promise<Lottery[]>

    // Get lotteries by state
    async getByState(stateCode: string): Promise<Lottery[]>
  }
}
```

#### Draws
```typescript
const api = {
  draws: {
    // Get latest draws
    async getLatest(): Promise<LotteryDraw[]>

    // Get draws by lottery
    async getByLottery(lotteryId: string): Promise<LotteryDraw[]>

    // Get specific draw results
    async getResults(drawId: string): Promise<LotteryNumbers>
  }
}
```

## Edge Functions

### lottery-sync
Endpoint: `${SUPABASE_URL}/functions/v1/lottery-sync`

Purpose: Synchronizes lottery data from external APIs

Headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
```

Response Format:
```typescript
interface SyncResponse {
  success: boolean;
  timestamp: string;
  data?: any;
  error?: string;
}
```