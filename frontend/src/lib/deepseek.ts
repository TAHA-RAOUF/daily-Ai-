import 'server-only';


import { extractedCaseSchema, type ExtractedCase } from 'src/schemas/extracted-case';

type ExtractDamageInput = {
  caseId: number;
  freitext: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const SYSTEM_PROMPT = `
You extract structured information from German vehicle workshop notes.
Return one valid JSON object only. Do not return Markdown or explanations.

Rules:
- Use only information supported by the German note.
- Do not invent a damage, zone, insurance type, or repair action.
- For damage cases, infer severity from the physical damage description using the rubric below.
- For service cases, severity must be null.
- A routine service case must return an empty damages array.
- A damage case must include every explicitly mentioned damaged zone.
- Copy a short exact German phrase into evidenceGerman for every damage.
- Use action "unknown" unless inspect, repair, paint, or replace is supported by the note.
- Confidence must be between 0 and 1.

Allowed caseType values:
service, damage

Allowed caseKind values:
Parkschaden, Auffahrunfall, Hagelschaden, Steinschlag, Vandalismus,
Wildunfall, Rangierschaden, Ölwechsel, Inspektion, HU/AU,
Räder und Reifen, Bremsen

Allowed severity values:
leicht, mittel, schwer, null

Severity rules:

Return "leicht" when all mentioned damage is cosmetic or minor:
- Kratzer im Klarlack
- feine Kratzspuren
- Lackabrieb
- Schrammen
- Lack nicht durch
- Druckstelle
- kleine Delle
- small cosmetic damage without structural deformation

Return "schwer" when at least one damage contains structural failure or major deformation:
- Träger verformt
- Aufnahme abgerissen
- Bauteil durchgebrochen
- Teil gerissen und lose
- Blech verzogen
- stark eingedrückt
- großflächig deformiert
- Austausch statt Instandsetzung
- major or widespread deformation

Return "mittel" for damage between these two levels:
- Riss im Lack
- Kratzer bis auf Grundierung
- Delle mit Lackschaden
- Halterung gebrochen
- Lack abgeplatzt
- Kunststoff eingedrückt
- damage requiring normal bodywork, painting, or component replacement without structural failure

Important:
- Use the most serious physical damage when several zones are mentioned.
- Do not increase severity only because several zones are mentioned.
- Do not use insurance type, repair status, customer urgency, replacement-car needs, or the number of zones to determine severity.
- Use null only for service cases.

Allowed insuranceType values:
gesteuert, haftpflicht_gegner, selbstzahler, teilkasko, vollkasko, null

Allowed damage zones:
Außenspiegel links, Außenspiegel rechts, Beifahrertür, Dach, Fahrertür,
Heckklappe, Kotflügel hinten links, Kotflügel hinten rechts,
Kotflügel vorne links, Kotflügel vorne rechts, Motorhaube, Schweller links,
Schweller rechts, Stoßstange hinten, Stoßstange hinten links,
Stoßstange hinten rechts, Stoßstange vorne, Stoßstange vorne links,
Stoßstange vorne rechts, Tür hinten links, Tür hinten rechts,
Windschutzscheibe

Required JSON shape:
{
  "caseId": 123,
  "caseType": "damage",
  "caseKind": "Parkschaden",
  "severity": "mittel",
  "insuranceType": "vollkasko",
  "damages": [
    {
      "zone": "Stoßstange hinten",
      "damageType": "Delle mit Lackschaden",
      "action": "repair",
      "evidenceGerman": "Stoßstange hinten, Delle mit Lackschaden",
      "confidence": 0.95
    }
  ],
  "warnings": []
}
`.trim();

function getRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function parseJsonContent(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  return JSON.parse(cleaned);
}

export async function extractDamageCase(input: ExtractDamageInput): Promise<ExtractedCase> {
  const apiKey = getRequiredEnvironment('DEEPSEEK_API_KEY');
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(
    /\/$/,
    ''
  );
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  if (!input.freitext.trim()) {
    throw new Error('freitext must not be empty.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({ caseId: input.caseId, freitext: input.freitext }),
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`DeepSeek request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('DeepSeek returned an empty response.');
  }

  const result = extractedCaseSchema.parse(parseJsonContent(content));

  if (result.caseId !== input.caseId) {
    throw new Error(`DeepSeek returned caseId ${result.caseId} instead of ${input.caseId}.`);
  }

  return result;
}
