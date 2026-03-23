import { APSASymptomEvidence, APSAHypothesis } from '../types';
 
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
 
interface AStarNode {
  condition: string;           // disease name (node identity)
  gCost: number;               // penalty: absent symptoms found in this disease
  hCost: number;               // heuristic: present symptoms NOT covered by this disease
  fCost: number;               // f = g + h
  supporting: string[];        // present symptoms matched
  contradicting: string[];     // absent symptoms found
}
 
// ---------------------------------------------------------------------------
// Heuristic
// ---------------------------------------------------------------------------
 
/**
 * h(n): count of user's PRESENT symptoms that this disease does NOT cover.
 * Lower is better — a perfect match returns 0.
 */
function heuristic(
  diseaseTokens: Set<string>,
  presentSymptoms: string[]
): number {
  return presentSymptoms.filter(
    s => ![...diseaseTokens].some(t => t.includes(s))
  ).length;
}
 
/**
 * g(n): count of user's ABSENT symptoms that ARE listed for this disease.
 * These are contradictions — penalises diseases that require symptoms the user doesn't have.
 */
function gCost(
  diseaseTokens: Set<string>,
  absentSymptoms: string[]
): number {
  return absentSymptoms.filter(
    s => [...diseaseTokens].some(t => t.includes(s))
  ).length;
}
 
// ---------------------------------------------------------------------------
// A* Search
// ---------------------------------------------------------------------------
 
/**
 * aStarDiseaseSearch
 *
 * Searches the disease knowledge base using A* to rank diseases by how well
 * they match the user's reported symptom evidence.
 *
 * @param knowledge   - Map of disease name → symptom token set (from APSAEngine)
 * @param evidence    - Symptom evidence collected from the user
 * @param topK        - How many top results to return (default: 6)
 * @returns           - Ranked list of APSAHypothesis objects (best match first)
 */
export function aStarDiseaseSearch(
  knowledge: Record<string, Set<string>>,
  evidence: APSASymptomEvidence[],
  topK = 6
): APSAHypothesis[] {
 
  const presentSymptoms = evidence
    .filter(e => e.presence === 'present')
    .map(e => e.name.toLowerCase());
 
  const absentSymptoms = evidence
    .filter(e => e.presence === 'absent')
    .map(e => e.name.toLowerCase());
 
  // Build all candidate nodes (one per disease that has at least one match)
  const openList: AStarNode[] = [];
 
  for (const [condition, tokens] of Object.entries(knowledge)) {
    const supporting = presentSymptoms.filter(
      s => [...tokens].some(t => t.includes(s))
    );
 
    // Only consider diseases that match at least one present symptom
    if (supporting.length === 0) continue;
 
    const contradicting = absentSymptoms.filter(
      s => [...tokens].some(t => t.includes(s))
    );
 
    const g = gCost(tokens, absentSymptoms);
    const h = heuristic(tokens, presentSymptoms);
    const f = g + h;
 
    openList.push({ condition, gCost: g, hCost: h, fCost: f, supporting, contradicting });
  }
 
  // A* explores nodes with lowest f(n) first
  openList.sort((a, b) => a.fCost - b.fCost);
 
  // Take top K results from the explored (sorted) list
  const topResults = openList.slice(0, topK);
 
  if (topResults.length === 0) return [];
 
  // Normalize into probabilities for APSAHypothesis
  // Use inverted fCost so lower cost = higher probability
  const maxF = Math.max(...topResults.map(n => n.fCost)) + 1;
  const weights = topResults.map(n => maxF - n.fCost);
  const total = weights.reduce((s, w) => s + w, 0) || 1;
 
  return topResults.map<APSAHypothesis>((node, i) => ({
    condition:     node.condition,
    probability:   weights[i] / total,
    supporting:    node.supporting,
    contradicting: node.contradicting,
  }));
}