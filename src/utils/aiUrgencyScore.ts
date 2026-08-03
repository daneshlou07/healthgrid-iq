/**
 * AI Urgency Score Utility
 * Scans radiographer preliminary findings & impression text for high-severity
 * clinical keywords and computes a triage score for worklist prioritisation.
 */

export type AiUrgencyLevel = 'CRITICAL' | 'HIGH' | 'ROUTINE';

export interface AiUrgencyResult {
  score: number;
  level: AiUrgencyLevel;
  flags: string[];
}

// ── Keyword dictionaries ordered by severity ───────────────────────────────
const CRITICAL_KEYWORDS = [
  'pneumothorax',
  'tension pneumothorax',
  'hemorrhage',
  'haemorrhage',
  'intracranial bleed',
  'subarachnoid',
  'subdural',
  'epidural hematoma',
  'aortic dissection',
  'pulmonary embolism',
  'massive PE',
  'ruptured',
  'rupture',
  'acute MI',
  'tamponade',
  'pericardial effusion',
  'bowel perforation',
  'pneumoperitoneum',
  'spinal cord compression',
  'cauda equina',
  'intracranial hypertension',
  'herniation',
  'impending herniation',
  'displaced fracture',
  'open fracture',
  'critical',
  'urgent transfer',
  'immediate attention',
  'stat',
];

const HIGH_KEYWORDS = [
  'consolidation',
  'pleural effusion',
  'mass',
  'lesion',
  'tumour',
  'tumor',
  'neoplasm',
  'malignancy',
  'carcinoma',
  'metastasis',
  'metastases',
  'abscess',
  'empyema',
  'atelectasis',
  'pulmonary edema',
  'oedema',
  'ground glass opacity',
  'GGO',
  'lymphadenopathy',
  'enlarged lymph node',
  'hydrocephalus',
  'midline shift',
  'fracture',
  'compression fracture',
  'dislocation',
  'subluxation',
  'obstruction',
  'bowel obstruction',
  'hydronephrosis',
  'ascites',
  'hepatosplenomegaly',
  'abnormal',
  'suspicious',
];

/**
 * Computes an AI urgency score from radiology preliminary text.
 * Designed to work on radiographerFindings + radiographerImpression strings.
 */
export function computeAiUrgencyScore(
  findings: string = '',
  impression: string = ''
): AiUrgencyResult {
  const combined = `${findings} ${impression}`.toLowerCase();
  const flags: string[] = [];
  let score = 0;

  for (const keyword of CRITICAL_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      flags.push(keyword);
      score += 10;
    }
  }

  for (const keyword of HIGH_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      // Only add if not already counted as critical
      if (!flags.includes(keyword)) {
        flags.push(keyword);
      }
      score += 3;
    }
  }

  const level: AiUrgencyLevel =
    score >= 10 ? 'CRITICAL' : score >= 3 ? 'HIGH' : 'ROUTINE';

  return { score, level, flags: [...new Set(flags)] };
}

/** Returns a stable sort comparator for cases, CRITICAL first */
export function urgencyComparator(
  aScore: AiUrgencyResult,
  bScore: AiUrgencyResult
): number {
  return bScore.score - aScore.score;
}
