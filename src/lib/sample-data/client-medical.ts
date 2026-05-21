/**
 * Dummy data for the Admin → Reports → Services → Client Medical screen.
 *
 * Derived from the Sales Report sample. Each receipt's category drives a
 * representative disease + treatment reason. Case file number "C.FromNo" is
 * deterministic per client so the same person carries the same file across
 * visits.
 */
import { SALES_REPORT_ROWS } from './sales-report';

export interface ClientMedicalRow {
  key: string;
  branchName: string;
  clientName: string;
  mobileNumber: string;
  disease: string;
  reason: string;
  caseFromNo: string;
  /** Category — used for filtering. */
  category: string;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
}

/** Pool of (disease, reason) pairs per category. Picked deterministically. */
const MEDICAL_BY_CATEGORY: Record<string, Array<{ disease: string; reason: string }>> = {
  'Skin Services': [
    { disease: 'Melasma',                reason: 'Hyperpigmentation on cheeks; recommended chemical peel course' },
    { disease: 'Acne Vulgaris',          reason: 'Active inflammatory acne; topical + peel regimen prescribed' },
    { disease: 'Post-acne scarring',     reason: 'Box-car scars on forehead; TCA cross + peel cycle' },
    { disease: 'Periorbital dark circles',reason: 'Pigmentation under eyes; under-eye peel scheduled'    },
    { disease: 'Photoaging',             reason: 'Sun-induced pigmentation; pumpkin peel series'         },
  ],
  'LASER': [
    { disease: 'Hirsutism',              reason: 'Excess hair growth on lower legs; laser-hair-removal plan' },
    { disease: 'Facial hair (PCOS)',     reason: 'Hormonal hair on upper lip; long-term laser course'        },
    { disease: 'Folliculitis',           reason: 'Recurrent ingrown hair; laser preferred over waxing'        },
  ],
  'Hair Care': [
    { disease: 'Androgenetic alopecia',  reason: 'Male/female-pattern hair loss; PRP therapy course'          },
    { disease: 'Telogen effluvium',      reason: 'Diffuse hair shedding post-illness; trichology consult'     },
    { disease: 'Seborrheic dermatitis',  reason: 'Itchy flaky scalp; medicated shampoo regimen'               },
  ],
  'Products': [
    { disease: 'Dry scalp',              reason: 'Take-home anti-dandruff shampoo prescribed'                 },
    { disease: 'Vitamin deficiency',     reason: 'Multivitamin & multi-mineral supplementation'               },
    { disease: 'Dry skin',               reason: 'Daily ceramide-based cleanser + moisturiser'                },
  ],
  'Wellness': [
    { disease: 'Lifestyle metabolic risk', reason: 'Pre-diabetic markers; annual wellness programme' },
    { disease: 'Chronic fatigue',          reason: 'Stress-induced; lifestyle + nutrition plan'      },
  ],
};

/** Build a stable case-file number from the client name. */
function makeCaseFromNo(clientName: string): string {
  const hash = clientName
    .split('')
    .reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 0);
  const year = 2023 + (hash % 3); // 2023..2025
  const serial = (hash % 9000) + 1000;
  return `CF-${year}-${serial}`;
}

function deriveRows(): ClientMedicalRow[] {
  return SALES_REPORT_ROWS.map((r, idx) => {
    const pool = MEDICAL_BY_CATEGORY[r.category] ?? [
      { disease: 'General consultation', reason: 'Routine wellness consultation' },
    ];
    const pick = pool[idx % pool.length];
    return {
      key: r.receiptNumber,
      branchName: r.branchName,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      disease: pick.disease,
      reason: pick.reason,
      caseFromNo: makeCaseFromNo(r.clientName),
      category: r.category,
      receiptDate: r.receiptDate,
    };
  });
}

export const CLIENT_MEDICAL_ROWS: ClientMedicalRow[] = deriveRows();
