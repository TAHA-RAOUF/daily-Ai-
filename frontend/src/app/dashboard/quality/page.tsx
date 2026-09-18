import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { getEvaluationReport } from 'src/lib/server/damage-data';

export const metadata = { title: `Data quality - ${CONFIG.appName}` };

export default async function Page() {
  const report = await getEvaluationReport();
  const metrics = [
    ['Coverage', report.coverage.coverageRate], ['Case type accuracy', report.accuracy.caseType],
    ['Case kind accuracy', report.accuracy.caseKind], ['Severity accuracy', report.accuracy.severityDamageCases],
    ['Insurance accuracy', report.accuracy.insuranceDamageCases], ['Exact-zone accuracy', report.accuracy.exactZonesDamageCases],
    ['Zone precision', report.zones.precision], ['Zone recall', report.zones.recall], ['Zone F1', report.zones.f1],
  ] as const;
  return <DashboardContent maxWidth="xl">
    <Typography variant="h4">Evaluation quality</Typography><Typography color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>Offline evaluation metrics from the completed 1,000-case benchmark</Typography>
    <Alert severity="info" sx={{ mb: 3 }}>These metrics compare predictions with evaluation ground truth. Ground-truth values are not used as application predictions or sent to DeepSeek.</Alert>
    <Grid container spacing={2.5}>{metrics.map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}><Card variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h4" sx={{ mt: 0.75 }}>{(value * 100).toFixed(value === 1 ? 0 : 1)}%</Typography></Card></Grid>)}
      <Grid size={{ xs: 12, md: 4 }}><Card variant="outlined" sx={{ p: 3, borderRadius: 1.5, height: 1 }}><Typography variant="h6">Evaluation coverage</Typography><Stack divider={<Divider />} sx={{ mt: 2 }}><Row label="Source cases" value={report.coverage.sourceCases} /><Row label="Extracted cases" value={report.coverage.extractedCases} /><Row label="Evaluated cases" value={report.coverage.evaluatedCases} /><Row label="Missing cases" value={report.coverage.missingCases} /></Stack></Card></Grid>
      <Grid size={{ xs: 12, md: 8 }}><Card variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography variant="h6">Incorrect cases ({report.incorrectCaseCount})</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Predicted results requiring model-quality review</Typography><Stack divider={<Divider />} sx={{ mt: 2 }}>{report.incorrectCases.slice(0, 12).map((item) => <Stack key={item.caseId} component={RouterLink} href={paths.dashboard.caseDetails(item.caseId)} direction="row" justifyContent="space-between" sx={{ py: 1.25, color: 'inherit', textDecoration: 'none' }}><Typography variant="body2" fontWeight={600}>DA-{item.caseId}</Typography><Typography variant="caption" color="text.secondary">{Object.entries(item.correct).filter(([, correct]) => !correct).map(([field]) => field).join(', ') || 'Zone mismatch'}</Typography></Stack>)}</Stack></Card></Grid>
    </Grid>
  </DashboardContent>;
}

function Row({ label, value }: { label: string; value: number }) { return <Stack direction="row" justifyContent="space-between" sx={{ py: 1.25 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="subtitle2">{value}</Typography></Stack>; }
