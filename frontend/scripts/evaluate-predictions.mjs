import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const samplePath = path.join(
  root,
  'data/samples/evaluation-cases.json'
);

const predictionsPath = path.join(
  root,
  'data/processed/evaluation-predictions.json'
);

const reportPath = path.join(
  root,
  'data/processed/evaluation-report.json'
);

const sampleFile = JSON.parse(
  await readFile(samplePath, 'utf8')
);

const predictionsFile = JSON.parse(
  await readFile(predictionsPath, 'utf8')
);

const predictionsById = new Map(
  predictionsFile.predictions.map((item) => [
    item.caseId,
    item,
  ])
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

let caseTypeCorrect = 0;
let caseKindCorrect = 0;

let damageCaseCount = 0;
let severityCorrect = 0;
let insuranceCorrect = 0;
let exactDamageZones = 0;

let zoneTruePositives = 0;
let zoneFalsePositives = 0;
let zoneFalseNegatives = 0;

const perCase = [];

for (const sample of sampleFile.cases) {
  const storedPrediction = predictionsById.get(sample.id);

  if (
    !storedPrediction ||
    storedPrediction.status !== 'success'
  ) {
    continue;
  }

  const expected = sample.expected;
  const predicted = storedPrediction.prediction;

  const expectedZones = expected.zones ?? [];

  const predictedZones = predicted.damages.map(
    (damage) => damage.zone
  );

  const zoneComparison = compareZones(
    expectedZones,
    predictedZones
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

  if (typeCorrect) {
    caseTypeCorrect += 1;
  }

  if (kindCorrect) {
    caseKindCorrect += 1;
  }

  zoneTruePositives +=
    zoneComparison.truePositives.length;

  zoneFalsePositives +=
    zoneComparison.falsePositives.length;

  zoneFalseNegatives +=
    zoneComparison.falseNegatives.length;

  if (expected.case_type === 'damage') {
    damageCaseCount += 1;

    if (severityMatches) {
      severityCorrect += 1;
    }

    if (insuranceMatches) {
      insuranceCorrect += 1;
    }

    if (zoneComparison.exact) {
      exactDamageZones += 1;
    }
  }

  perCase.push({
    caseId: sample.id,
    sampleGroup: sample.sampleGroup,

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

const successfulPredictions = perCase.length;

const failedPredictions =
  predictionsFile.predictions.filter(
    (item) => item.status === 'failed'
  ).length;

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

  coverage: {
    sampleCases: sampleFile.cases.length,
    predictionsStored:
      predictionsFile.predictions.length,
    successfulPredictions,
    failedPredictions,
    remainingCases:
      sampleFile.cases.length - successfulPredictions,
    coverageRate: divide(
      successfulPredictions,
      sampleFile.cases.length
    ),
  },

  accuracy: {
    caseType: divide(
      caseTypeCorrect,
      successfulPredictions
    ),

    caseKind: divide(
      caseKindCorrect,
      successfulPredictions
    ),

    severityDamageCases: divide(
      severityCorrect,
      damageCaseCount
    ),

    insuranceDamageCases: divide(
      insuranceCorrect,
      damageCaseCount
    ),

    exactZonesDamageCases: divide(
      exactDamageZones,
      damageCaseCount
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

  notes: [
    'Severity, insurance and exact-zone accuracy are measured only on damage cases.',
    'Damage type and repair action are not scored because the dataset ground truth does not label them.',
  ],

  perCase,
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
console.log('Evaluation results');
console.log('------------------');

console.log(
  `Coverage: ${successfulPredictions}/${sampleFile.cases.length}`
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

console.log('');
console.log(`Report saved to ${reportPath}`);