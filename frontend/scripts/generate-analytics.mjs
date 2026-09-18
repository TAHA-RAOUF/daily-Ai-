import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const inputPath = path.join(
  root,
  'data/processed/cases-extracted.json'
);

const outputPath = path.join(
  root,
  'data/processed/analytics.json'
);

const extractedFile = JSON.parse(
  await readFile(inputPath, 'utf8')
);

const records = extractedFile.records;

function increment(target, key, amount = 1) {
  const normalizedKey =
    key === null ||
    key === undefined ||
    key === ''
      ? 'Unknown'
      : String(key);

  target[normalizedKey] =
    (target[normalizedKey] ?? 0) + amount;
}

function sortedCounts(counts, limit) {
  const values = Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(second.label);
    });

  return limit ? values.slice(0, limit) : values;
}

function percentage(value, total) {
  if (total === 0) {
    return 0;
  }

  return Number(
    ((value / total) * 100).toFixed(2)
  );
}

const caseTypeCounts = {};
const caseKindCounts = {};
const severityCounts = {};
const insuranceCounts = {};
const zoneCounts = {};
const actionCounts = {};
const manufacturerCounts = {};
const statusCounts = {};
const zoneCombinationCounts = {};

const manufacturerStatistics = new Map();

const replacementCaseIds = new Set();
const manualReviewCaseIds = new Set();

let openWorklistCases = 0;
let closedWorklistCases = 0;
let canceledCases = 0;
let doneStatusCases = 0;

let totalDamages = 0;
let multiZoneDamageCases = 0;

let totalOrders = 0;
let totalWorkshopTasks = 0;
let totalWorkLoad = 0;

let confidenceTotal = 0;
let confidenceCount = 0;
let lowConfidenceDamages = 0;
let unknownActionDamages = 0;
let casesWithWarnings = 0;

for (const record of records) {
  const extraction = record.extraction;

  increment(
    caseTypeCounts,
    extraction.caseType
  );

  increment(
    caseKindCounts,
    extraction.caseKind
  );

  increment(
    manufacturerCounts,
    record.vehicle.manufacturer
  );

  increment(
    statusCounts,
    record.currentStatus?.name
  );

  if (record.inOpenList) {
    openWorklistCases += 1;
  } else {
    closedWorklistCases += 1;
  }

  if (record.canceledAt) {
    canceledCases += 1;
  }

  if (record.currentStatus?.is_done) {
    doneStatusCases += 1;
  }

  totalOrders +=
    record.operations?.orderCount ?? 0;

  totalWorkshopTasks +=
    record.operations?.workshopTaskCount ?? 0;

  totalWorkLoad +=
    record.operations?.workLoadTotal ?? 0;

  const manufacturer =
    record.vehicle.manufacturer || 'Unknown';

  if (!manufacturerStatistics.has(manufacturer)) {
    manufacturerStatistics.set(manufacturer, {
      manufacturer,
      totalCases: 0,
      damageCases: 0,
      damageMentions: 0,
    });
  }

  const manufacturerEntry =
    manufacturerStatistics.get(manufacturer);

  manufacturerEntry.totalCases += 1;

  if (extraction.caseType !== 'damage') {
    continue;
  }

  manufacturerEntry.damageCases += 1;

  increment(
    severityCounts,
    extraction.severity
  );

  increment(
    insuranceCounts,
    extraction.insuranceType
  );

  if (extraction.warnings.length > 0) {
    casesWithWarnings += 1;
    manualReviewCaseIds.add(record.id);
  }

  const uniqueZones = [
    ...new Set(
      extraction.damages.map(
        (damage) => damage.zone
      )
    ),
  ];

  if (uniqueZones.length > 1) {
    multiZoneDamageCases += 1;

    const combination = [...uniqueZones]
      .sort((first, second) =>
        first.localeCompare(second)
      )
      .join(' + ');

    increment(
      zoneCombinationCounts,
      combination
    );
  }

  for (const damage of extraction.damages) {
    totalDamages += 1;
    manufacturerEntry.damageMentions += 1;

    increment(zoneCounts, damage.zone);
    increment(actionCounts, damage.action);

    confidenceTotal += damage.confidence;
    confidenceCount += 1;

    if (damage.confidence < 0.75) {
      lowConfidenceDamages += 1;
      manualReviewCaseIds.add(record.id);
    }

    if (damage.action === 'unknown') {
      unknownActionDamages += 1;
      manualReviewCaseIds.add(record.id);
    }

    if (damage.action === 'replace') {
      replacementCaseIds.add(record.id);
    }
  }
}

const serviceCases =
  caseTypeCounts.service ?? 0;

const damageCases =
  caseTypeCounts.damage ?? 0;

const averageConfidence =
  confidenceCount === 0
    ? null
    : Number(
        (
          confidenceTotal / confidenceCount
        ).toFixed(4)
      );

const manufacturers = Array.from(
  manufacturerStatistics.values()
).sort((first, second) => {
  if (
    second.damageCases !== first.damageCases
  ) {
    return (
      second.damageCases - first.damageCases
    );
  }

  return first.manufacturer.localeCompare(
    second.manufacturer
  );
});

const analytics = {
  generatedAt: new Date().toISOString(),
  promptVersion:
    extractedFile.promptVersion ?? 'unknown',

  summary: {
    totalCases: records.length,

    serviceCases,
    damageCases,

    servicePercentage: percentage(
      serviceCases,
      records.length
    ),

    damagePercentage: percentage(
      damageCases,
      records.length
    ),

    openWorklistCases,
    closedWorklistCases,
    canceledCases,
    doneStatusCases,

    totalDamages,
    multiZoneDamageCases,

    replacementRecommendationCases:
      replacementCaseIds.size,

    averageDamageConfidence:
      averageConfidence,

    lowConfidenceDamages,
    unknownActionDamages,
    casesWithWarnings,

    manualReviewCases:
      manualReviewCaseIds.size,

    totalOrders,
    totalWorkshopTasks,
    totalWorkLoad,
  },

  distributions: {
    caseTypes:
      sortedCounts(caseTypeCounts),

    caseKinds:
      sortedCounts(caseKindCounts),

    severities:
      sortedCounts(severityCounts),

    insuranceTypes:
      sortedCounts(insuranceCounts),

    damageZones:
      sortedCounts(zoneCounts),

    repairActions:
      sortedCounts(actionCounts),

    manufacturers:
      sortedCounts(manufacturerCounts),

    statuses:
      sortedCounts(statusCounts),
  },

  topDamageZones:
    sortedCounts(zoneCounts, 10),

  topZoneCombinations:
    sortedCounts(
      zoneCombinationCounts,
      10
    ),

  manufacturers,

  quality: {
    averageDamageConfidence:
      averageConfidence,

    lowConfidenceDamages,
    unknownActionDamages,
    casesWithWarnings,

    manualReviewCaseIds:
      Array.from(manualReviewCaseIds)
        .sort((first, second) =>
          first - second
        ),
  },
};

await mkdir(path.dirname(outputPath), {
  recursive: true,
});

await writeFile(
  outputPath,
  `${JSON.stringify(
    analytics,
    null,
    2
  )}\n`,
  'utf8'
);

console.log('');
console.log('Analytics generated');
console.log('-------------------');

console.log(
  `Total cases: ${analytics.summary.totalCases}`
);

console.log(
  `Service cases: ${analytics.summary.serviceCases}`
);

console.log(
  `Damage cases: ${analytics.summary.damageCases}`
);

console.log(
  `Total damage mentions: ${analytics.summary.totalDamages}`
);

console.log(
  `Multi-zone damage cases: ${analytics.summary.multiZoneDamageCases}`
);

console.log(
  `Replacement recommendations: ${analytics.summary.replacementRecommendationCases}`
);

console.log(
  `Average confidence: ${analytics.summary.averageDamageConfidence}`
);

console.log(
  `Manual-review cases: ${analytics.summary.manualReviewCases}`
);

console.log('');
console.log('Top damage zones:');

console.table(
  analytics.topDamageZones
);

console.log('');
console.log(`Saved to ${outputPath}`);