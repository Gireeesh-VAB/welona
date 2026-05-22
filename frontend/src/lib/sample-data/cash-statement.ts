/**
 * Dummy data for the Admin → Reports → Cash → Cash Statement screen.
 *
 * Day-wise rolling cash ledger per branch. For each branch, 14 consecutive
 * days are produced (May 08 to May 21, 2026). The opening of day N is the
 * closing of day N-1, so the ledger is internally consistent. The latest
 * day for some branches is intentionally left "Pending" reconciliation.
 */

export interface CashStatementRow {
  key: string;
  date: string;                  // ISO yyyy-mm-dd
  branchName: string;
  openingBalance: number;        // paise
  cashIn: number;                // collections + petty in
  cashOut: number;               // payments + petty out
  netMovement: number;           // cashIn - cashOut
  closingBalance: number;        // opening + net
  reconciledDifference: number | null;  // paise — counted - expected
}

const r = (rupees: number) => rupees * 100;

interface BranchTrack {
  name: string;
  startOpening: number;
  /** Pattern of (inflow, outflow) in rupees, one per day. */
  daily: Array<[number, number]>;
  /** Days from the end that are still pending reconciliation. */
  pendingFromEnd: number;
}

const TRACKS: BranchTrack[] = [
  {
    name: 'Jubilee Hills',
    startOpening: r(15000),
    daily: [
      [38000, 9500], [42000, 8200], [36500, 7600], [44000, 11000], [40500, 9800],
      [37000, 8400], [43000, 10500], [46000, 12000], [39500, 9300], [41500, 9000],
      [44500, 11500], [38500, 8900], [42500, 9600], [42500, 10300],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Banjara Hills',
    startOpening: r(20000),
    daily: [
      [33500, 7800], [35000, 8200], [31500, 7100], [36000, 8500], [32500, 7600],
      [34500, 7900], [36500, 8400], [38500, 9200], [33000, 7500], [35500, 8000],
      [37000, 8600], [33500, 7700], [36000, 8300], [36000, 7400],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Bandra West',
    startOpening: r(28000),
    daily: [
      [52000, 13500], [55000, 14200], [49000, 12100], [57000, 15500], [51000, 13800],
      [54000, 14400], [56000, 14600], [60000, 16500], [52500, 13900], [55500, 14300],
      [58000, 15100], [53000, 14100], [56500, 14500], [58500, 17700],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Powai',
    startOpening: r(12000),
    daily: [
      [26000, 6800], [28000, 7200], [25500, 6500], [29000, 7600], [27000, 7000],
      [28500, 7300], [30000, 7700], [31500, 8000], [27500, 6900], [29500, 7500],
      [30500, 7800], [27000, 6700], [29000, 7200], [28000, 9400],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Koramangala',
    startOpening: r(22000),
    daily: [
      [45000, 11500], [48000, 12000], [43500, 11000], [50000, 13000], [46500, 12100],
      [48500, 12300], [50000, 12800], [52500, 13500], [47000, 11900], [49000, 12200],
      [51000, 12700], [46000, 11800], [49500, 12500], [51000, 13600],
    ],
    pendingFromEnd: 2,
  },
  {
    name: 'Indiranagar',
    startOpening: r(14000),
    daily: [
      [28500, 7200], [30000, 7500], [27500, 6900], [31000, 7800], [29000, 7300],
      [30500, 7600], [32000, 7900], [33500, 8200], [29500, 7400], [31500, 7700],
      [32500, 8000], [29000, 7300], [31000, 7600], [31500, 8300],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Connaught Place',
    startOpening: r(35000),
    daily: [
      [65000, 17500], [70000, 18200], [62500, 16800], [72000, 19500], [67000, 17800],
      [69000, 18100], [73000, 19000], [76500, 20500], [68500, 17900], [72500, 18800],
      [74500, 19200], [68000, 17600], [71500, 18500], [77000, 25000],
    ],
    pendingFromEnd: 1,
  },
  {
    name: 'Anna Nagar',
    startOpening: r(9000),
    daily: [
      [20500, 5400], [22000, 5700], [19500, 5100], [23000, 5900], [21000, 5500],
      [22500, 5700], [23500, 5900], [24500, 6100], [21500, 5500], [22500, 5800],
      [23500, 5900], [20500, 5400], [22500, 5800], [22800, 5800],
    ],
    pendingFromEnd: 4,
  },
];

function deriveRows(): CashStatementRow[] {
  const rows: CashStatementRow[] = [];
  const endDate = new Date('2026-05-21');

  for (const track of TRACKS) {
    let opening = track.startOpening;
    const totalDays = track.daily.length;
    for (let i = 0; i < totalDays; i++) {
      const dayOffset = totalDays - 1 - i; // i=0 is oldest day
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - dayOffset);
      const iso = date.toISOString().slice(0, 10);

      const [inflowRupees, outflowRupees] = track.daily[i];
      const cashIn = r(inflowRupees);
      const cashOut = r(outflowRupees);
      const net = cashIn - cashOut;
      const closing = opening + net;

      const isPending = i >= totalDays - track.pendingFromEnd;
      // Random-ish small variance for reconciled days, null for pending.
      const diff = isPending ? null : (((i + track.name.length) % 5) - 2) * 100; // -200..200 paise

      rows.push({
        key: `${track.name}::${iso}`,
        date: iso,
        branchName: track.name,
        openingBalance: opening,
        cashIn, cashOut,
        netMovement: net,
        closingBalance: closing,
        reconciledDifference: diff,
      });

      opening = closing;
    }
  }
  // Newest day first so the page lands on something useful.
  return rows.sort((a, b) => {
    const d = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (d !== 0) return d;
    return a.branchName.localeCompare(b.branchName);
  });
}

export const CASH_STATEMENT_ROWS: CashStatementRow[] = deriveRows();
