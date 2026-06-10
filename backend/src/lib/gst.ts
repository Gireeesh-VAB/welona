export interface GstInput {
  /** Net amount in paise (after discount/roundOff) — this is the amount to tax */
  netAmountPaise: number;
  /** GST percentage (whole number: 5, 12, 18, 28) */
  percentage: number;
  /** Whether the netAmountPaise already includes tax (inclusive) or not (exclusive) */
  taxType: 'inclusive' | 'exclusive';
  /** State ID of the branch */
  branchStateId: string | null | undefined;
  /** State ID of the customer */
  customerStateId: string | null | undefined;
}

export interface GstResult {
  taxableAmt: number; // paise — base before tax
  cgstPct: number;    // basis points (e.g. 900 = 9%)
  cgstAmt: number;    // paise
  sgstPct: number;
  sgstAmt: number;
  igstPct: number;
  igstAmt: number;
  totalTax: number;   // paise
  grandTotal: number; // paise
}

const ZERO_RESULT = (netAmountPaise: number): GstResult => ({
  taxableAmt: netAmountPaise,
  cgstPct: 0,
  cgstAmt: 0,
  sgstPct: 0,
  sgstAmt: 0,
  igstPct: 0,
  igstAmt: 0,
  totalTax: 0,
  grandTotal: netAmountPaise,
});

export function calculateGst(input: GstInput): GstResult {
  const { netAmountPaise, percentage, taxType, branchStateId, customerStateId } = input;

  // No tax cases
  if (!percentage || !taxType) {
    return ZERO_RESULT(netAmountPaise);
  }

  // Intra-state check: both states must be present and equal
  const isIntraState =
    !!branchStateId &&
    !!customerStateId &&
    branchStateId === customerStateId;

  // Compute taxable amount and total tax
  let taxableAmt: number;
  let totalTax: number;
  let grandTotal: number;

  if (taxType === 'exclusive') {
    taxableAmt = netAmountPaise;
    totalTax = Math.round((netAmountPaise * percentage) / 100);
    grandTotal = taxableAmt + totalTax;
  } else {
    // inclusive
    taxableAmt = Math.round((netAmountPaise * 100) / (100 + percentage));
    totalTax = netAmountPaise - taxableAmt;
    grandTotal = netAmountPaise;
  }

  if (isIntraState) {
    // CGST + SGST — split total tax in half, round half-up for odd paise
    const cgstAmt = Math.ceil(totalTax / 2);
    const sgstAmt = totalTax - cgstAmt;
    const halfPct = Math.round((percentage / 2) * 100); // basis points

    return {
      taxableAmt,
      cgstPct: halfPct,
      cgstAmt,
      sgstPct: halfPct,
      sgstAmt,
      igstPct: 0,
      igstAmt: 0,
      totalTax,
      grandTotal,
    };
  } else {
    // IGST
    const igstPct = percentage * 100; // basis points

    return {
      taxableAmt,
      cgstPct: 0,
      cgstAmt: 0,
      sgstPct: 0,
      sgstAmt: 0,
      igstPct,
      igstAmt: totalTax,
      totalTax,
      grandTotal,
    };
  }
}
