import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const sourcePath = path.join(
  root,
  'data/raw/kit/dataset/da-cases.json'
);

const extractedPath = path.join(
  root,
  'data/processed/cases-extracted.json'
);

const reportPath = path.join(
  root,
  'data/processed/full-evaluation-report.json'
);

const sourceCases = JSON.parse(
  await readFile(sourcePath, 'utf8')
);

const extractedFile = JSON.parse(
  await readFile(extractedPath, 'utf8')
);

const sourceById = new Map(
  sourceCases.map((item) => [item.id, item])
);

function divide(numerator, denominator) {
  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(4));
}

function sameNullableValue(first, second) {
  return (first ?? null) === (second ?? null);
}

function compareZones(expectedZones, predictedZones) {
  const expected = new Set(expectedZones);
  const predicted = new Set(predictedZones);

  const truePositives = predictedZones.filter((zone) =>
    expected.has(zone)
  );

  const falsePositives = predictedZones.filter(
    (zone) => !expected.has(zone)
  );

  const falseNegatives = expectedZones.filter(
    (zone) => !predicted.has(zone)
  );

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    exact:
      falsePositives.length === 0 &&
      falseNegatives.length === 0,
  };
}

function incrementConfusion(
  confusion,
  expected,
  predicted
) {
  const key = `${expected ?? 'null'} -> ${predicted ?? 'null'}`;

  confusion[key] = (confusion[key] ?? 0) + 1;
}

let evaluatedCases = 0;
let damageCases = 0;

let caseTypeCorrect = 0;
let caseKindCorrect = 0;
let severityCorrect = 0;
let insuranceCorrect = 0;
let exactDamageZones = 0;

let zoneTruePositives = 0;
let zoneFalsePositives = 0;
let zoneFalseNegatives = 0;

const caseTypeConfusion = {};
const caseKindConfusion = {};
const severityConfusion = {};
const insuranceConfusion = {};

const incorrectCases = [];

for (const record of extractedFile.records) {
  const sourceCase = sourceById.get(record.id);

  if (!sourceCase) {
    incorrectCases.push({
      caseId: record.id,
      error: 'Source case not found.',
    });

    continue;
  }

  evaluatedCases += 1;

  const expected = sourceCase.ground_truth;
  const predicted = record.extraction;

  const expectedZones = expected.zones ?? [];

  const predictedZones = predicted.damages.map(
    (damage) => damage.zone
  );

  const typeCorrect =
    predicted.caseType === expected.case_type;

  const kindCorrect =
    predicted.caseKind === expected.case_kind;

  const severityMatches = sameNullableValue(
    predicted.severity,
    expected.severity
  );

  const insuranceMatches = sameNullableValue(
    predicted.insuranceType,
    expected.insurance_type
  );

  const zoneComparison = compareZones(
    expectedZones,
    predictedZones
  );

  if (typeCorrect) {
    caseTypeCorrect += 1;
  }

  if (kindCorrect) {
    caseKindCorrect += 1;
  }

  incrementConfusion(
    caseTypeConfusion,
    expected.case_type,
    predicted.caseType
  );

  incrementConfusion(
    caseKindConfusion,
    expected.case_kind,
    predicted.caseKind
  );

  zoneTruePositives +=
    zoneComparison.truePositives.length;

  zoneFalsePositives +=
    zoneComparison.falsePositives.length;

  zoneFalseNegatives +=
    zoneComparison.falseNegatives.length;

  if (expected.case_type === 'damage') {
    damageCases += 1;

    if (severityMatches) {
      severityCorrect += 1;
    }

    if (insuranceMatches) {
      insuranceCorrect += 1;
    }

    if (zoneComparison.exact) {
      exactDamageZones += 1;
    }

    incrementConfusion(
      severityConfusion,
      expected.severity,
      predicted.severity
    );

    incrementConfusion(
      insuranceConfusion,
      expected.insurance_type,
      predicted.insuranceType
    );
  }

  const hasError =
    !typeCorrect ||
    !kindCorrect ||
    (
      expected.case_type === 'damage' &&
      (
        !severityMatches ||
        !insuranceMatches ||
        !zoneComparison.exact
      )
    );

  if (hasError) {
    incorrectCases.push({
      caseId: record.id,

      expected: {
        caseType: expected.case_type,
        caseKind: expected.case_kind,
        severity: expected.severity,
        insuranceType: expected.insurance_type,
        zones: expectedZones,
      },

      predicted: {
        caseType: predicted.caseType,
        caseKind: predicted.caseKind,
        severity: predicted.severity,
        insuranceType: predicted.insuranceType,
        zones: predictedZones,
      },

      correct: {
        caseType: typeCorrect,
        caseKind: kindCorrect,
        severity: severityMatches,
        insuranceType: insuranceMatches,
        zonesExact: zoneComparison.exact,
      },

      zoneErrors: {
        invented: zoneComparison.falsePositives,
        missing: zoneComparison.falseNegatives,
      },
    });
  }
}

const zonePrecision = divide(
  zoneTruePositives,
  zoneTruePositives + zoneFalsePositives
);

const zoneRecall = divide(
  zoneTruePositives,
  zoneTruePositives + zoneFalseNegatives
);

const zoneF1 =
  zonePrecision !== null &&
  zoneRecall !== null &&
  zonePrecision + zoneRecall > 0
    ? Number(
        (
          (2 * zonePrecision * zoneRecall) /
          (zonePrecision + zoneRecall)
        ).toFixed(4)
      )
    : null;

const report = {
  generatedAt: new Date().toISOString(),
  promptVersion:
    extractedFile.promptVersion ?? 'unknown',

  coverage: {
    sourceCases: sourceCases.length,
    extractedCases: extractedFile.records.length,
    evaluatedCases,
    missingCases:
      sourceCases.length - evaluatedCases,
    coverageRate: divide(
      evaluatedCases,
      sourceCases.length
    ),
  },

  accuracy: {
    caseType: divide(
      caseTypeCorrect,
      evaluatedCases
    ),

    caseKind: divide(
      caseKindCorrect,
      evaluatedCases
    ),

    severityDamageCases: divide(
      severityCorrect,
      damageCases
    ),

    insuranceDamageCases: divide(
      insuranceCorrect,
      damageCases
    ),

    exactZonesDamageCases: divide(
      exactDamageZones,
      damageCases
    ),
  },

  zones: {
    truePositives: zoneTruePositives,
    falsePositives: zoneFalsePositives,
    falseNegatives: zoneFalseNegatives,
    precision: zonePrecision,
    recall: zoneRecall,
    f1: zoneF1,
  },

  confusion: {
    caseType: caseTypeConfusion,
    caseKind: caseKindConfusion,
    severity: severityConfusion,
    insurance: insuranceConfusion,
  },

  incorrectCaseCount: incorrectCases.length,
  incorrectCases,

  notes: [
    'Ground truth is used only by this offline evaluator.',
    'The application must use extracted results rather than ground truth.',
    'Severity, insurance and exact-zone accuracy are measured only on damage cases.',
    'Damage descriptions and actions are not scored because the dataset does not provide ground-truth labels for them.',
  ],
};

await mkdir(path.dirname(reportPath), {
  recursive: true,
});

await writeFile(
  reportPath,
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

console.log('');
console.log('Full extraction evaluation');
console.log('--------------------------');

console.log(
  `Coverage: ${evaluatedCases}/${sourceCases.length}`
);

console.log(
  `Case type accuracy: ${report.accuracy.caseType}`
);

console.log(
  `Case kind accuracy: ${report.accuracy.caseKind}`
);

console.log(
  `Severity accuracy: ${report.accuracy.severityDamageCases}`
);

console.log(
  `Insurance accuracy: ${report.accuracy.insuranceDamageCases}`
);

console.log(
  `Exact damage zones: ${report.accuracy.exactZonesDamageCases}`
);

console.log(
  `Zone precision: ${report.zones.precision}`
);

console.log(
  `Zone recall: ${report.zones.recall}`
);

console.log(
  `Zone F1: ${report.zones.f1}`
);

console.log(
  `Cases containing an evaluated error: ${incorrectCases.length}`
);

console.log('');
console.log(`Report saved to ${reportPath}`);