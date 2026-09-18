import type { ProcessedDamageCase } from 'src/types/damage-intelligence';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { getDamageCases, getDashboardAnalytics } from 'src/lib/server/damage-data';

import { Iconify } from 'src/components/iconify';
import { SeverityChip } from 'src/components/damage-intelligence';

export const metadata = { title: `Overview - ${CONFIG.appName}` };
const panelSx = { borderRadius: 1.5, borderColor: 'divider' };

export default async function Page() {
  const [analytics, cases] = await Promise.all([getDashboardAnalytics(), getDamageCases()]);
  const { summary } = analytics;
  const reviewQueue = cases.filter(needsReview).sort((a, b) => priority(b) - priority(a)).slice(0, 7);
  const severeCases = cases.filter((item) => item.severity === 'schwer' && !item.statusDone).length;
  const unknownCases = cases.filter((item) => item.damages.some((damage) => damage.action === 'unknown')).length;
  const maxZone = analytics.topDamageZones[0]?.count ?? 1;

  return <DashboardContent maxWidth="xl">
    <Card component="section" sx={{ mb: 3, p: { xs: 3, md: 4 }, borderRadius: 1.5, bgcolor: 'grey.900', color: 'common.white', boxShadow: 'none' }}>
      <Grid container spacing={3} alignItems="flex-end">
        <Grid size={{ xs: 12, lg: 7 }}><Typography variant="overline" sx={{ color: 'grey.500' }}>DA Damage Intelligence</Typography><Typography component="h1" variant="h3" sx={{ mt: 0.5, maxWidth: 640 }}>Turn workshop notes into repair-ready decisions.</Typography><Typography sx={{ mt: 1.5, color: 'grey.400', maxWidth: 620 }}>Review extracted damage, inspect affected zones in 3D, confirm repair actions and move each vehicle into the workshop with less manual reading.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}><Button component={RouterLink} href={paths.dashboard.cases} variant="contained" color="error" endIcon={<Iconify icon="solar:double-alt-arrow-right-bold-duotone" />}>Open case worklist</Button><Button component={RouterLink} href={paths.dashboard.analyze} variant="outlined" sx={{ color: 'common.white', borderColor: 'grey.600', '&:hover': { borderColor: 'common.white' } }}>Analyze a new note</Button></Stack></Grid>
        <Grid size={{ xs: 12, lg: 5 }}><Grid container spacing={1}>{[[summary.openWorklistCases, 'Open cases'], [summary.damageCases, 'Damage cases'], [`${Math.round(summary.averageDamageConfidence * 100)}%`, 'Avg. confidence']].map(([value, label]) => <Grid key={String(label)} size={4}><Box sx={{ p: 2, borderLeft: 1, borderColor: 'grey.700' }}><Typography variant="h4">{value}</Typography><Typography variant="caption" sx={{ color: 'grey.500' }}>{label}</Typography></Box></Grid>)}</Grid></Grid>
      </Grid>
    </Card>

    <Box component="section" aria-labelledby="workflow-heading" sx={{ mb: 4 }}><Typography id="workflow-heading" component="h2" variant="h5">How to use the platform</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>A clear path from an unstructured note to a workshop decision</Typography><Card variant="outlined" sx={panelSx}><Grid container>{[
      ['01', 'Find the case', 'Search the worklist by case ID, vehicle or original German note.', 'solar:list-bold', paths.dashboard.cases],
      ['02', 'Inspect the extraction', 'Review detected zones, evidence and confidence in the 3D case view.', 'solar:eye-bold', paths.dashboard.caseDetails(834726)],
      ['03', 'Confirm the repair', 'Resolve unknown actions before scheduling paint, repair or replacement.', 'solar:file-check-bold-duotone', paths.dashboard.quality],
    ].map(([step, title, text, icon, href], index) => <Grid key={String(step)} size={{ xs: 12, md: 4 }} sx={{ borderRight: { md: index < 2 ? 1 : 0 }, borderBottom: { xs: index < 2 ? 1 : 0, md: 0 }, borderColor: 'divider' }}><Box component={RouterLink} href={String(href)} sx={{ display: 'block', height: 1, p: 3, color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'grey.50' } }}><Stack direction="row" justifyContent="space-between"><Typography variant="overline" color="text.secondary">Step {step}</Typography><Iconify icon={icon as 'solar:list-bold'} width={24} color="error.main" /></Stack><Typography variant="h6" sx={{ mt: 2 }}>{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{text}</Typography></Box></Grid>)}</Grid></Card></Box>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}><Card component="section" variant="outlined" sx={panelSx}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ p: 3, pb: 2 }}><Box><Typography component="h2" variant="h5">Review queue</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Cases that need a workshop decision first</Typography></Box><Button component={RouterLink} href={paths.dashboard.cases} size="small">View all cases</Button></Stack><Divider />
        <Stack divider={<Divider />}>{reviewQueue.map((item) => <Box key={item.id} component={RouterLink} href={paths.dashboard.caseDetails(item.id)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(220px, 1.2fr) minmax(150px, 1fr) auto' }, gap: 2, alignItems: 'center', px: 3, py: 2, color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'grey.50' } }}><Box><Stack direction="row" spacing={1} alignItems="center"><Typography variant="subtitle2">DA-{item.id}</Typography>{item.inOpenList && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />}</Stack><Typography variant="body2" color="text.secondary" noWrap>{item.vehicle.manufacturer} {item.vehicle.model}</Typography></Box><Box sx={{ display: { xs: 'none', sm: 'block' } }}><Typography variant="body2">{reason(item)}</Typography><Typography variant="caption" color="text.secondary">{item.damages.length} affected {item.damages.length === 1 ? 'zone' : 'zones'}</Typography></Box><Stack direction="row" spacing={1} alignItems="center"><SeverityChip severity={item.severity} /><Iconify icon="solar:double-alt-arrow-right-bold-duotone" color="text.secondary" /></Stack></Box>)}</Stack>
      </Card></Grid>

      <Grid size={{ xs: 12, lg: 4 }}><Stack spacing={3}><Card component="section" variant="outlined" sx={{ ...panelSx, p: 3 }}><Typography component="h2" variant="h5">Needs attention</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Resolve uncertainty before work begins</Typography><Stack divider={<Divider />} sx={{ mt: 2 }}><AttentionRow value={summary.manualReviewCases} label="Manual-review cases" helper="Prediction needs confirmation" tone="error" /><AttentionRow value={unknownCases} label="Unknown repair methods" helper="Choose inspect, repair, paint or replace" tone="warning" /><AttentionRow value={severeCases} label="Open heavy-damage cases" helper="Prioritize structural assessment" tone="error" /><AttentionRow value={summary.replacementRecommendationCases} label="Replacement recommendations" helper="Check parts availability" /></Stack><Button component={RouterLink} href={paths.dashboard.quality} fullWidth variant="outlined" color="inherit" sx={{ mt: 2.5 }}>Open data quality</Button></Card>
        <Card component="section" variant="outlined" sx={{ ...panelSx, p: 3 }}><Stack direction="row" justifyContent="space-between"><Box><Typography component="h2" variant="h5">Case mix</Typography><Typography variant="body2" color="text.secondary">Processed records</Typography></Box><Typography variant="h5">{summary.totalCases.toLocaleString()}</Typography></Stack><Stack spacing={2} sx={{ mt: 3 }}><MixBar label="Service" value={summary.serviceCases} total={summary.totalCases} /><MixBar label="Damage" value={summary.damageCases} total={summary.totalCases} damage /></Stack></Card></Stack></Grid>

      <Grid size={{ xs: 12, md: 7 }}><Card component="section" variant="outlined" sx={{ ...panelSx, p: 3, height: 1 }}><Typography component="h2" variant="h5">Most affected zones</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Use this to anticipate body and paint workload</Typography><Stack spacing={2} sx={{ mt: 3 }}>{analytics.topDamageZones.slice(0, 6).map((item, index) => <Box key={item.label}><Stack direction="row" spacing={1.5} alignItems="center"><Typography variant="caption" color="text.secondary" sx={{ width: 18 }}>{String(index + 1).padStart(2, '0')}</Typography><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{item.label}</Typography><Typography variant="body2" fontWeight={700}>{item.count}</Typography></Stack><LinearProgress color="error" variant="determinate" value={(item.count / maxZone) * 100} sx={{ mt: 0.75, height: 5 }} /></Box></Stack></Box>)}</Stack></Card></Grid>
      <Grid size={{ xs: 12, md: 5 }}><Card component="section" variant="outlined" sx={{ ...panelSx, p: 3, height: 1 }}><Typography component="h2" variant="h5">What the AI provides</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Use predictions as decision support, not silent approval</Typography><Stack spacing={2.5} sx={{ mt: 3 }}>{[['Damage classification', 'Service or damage case, kind and severity'], ['Exact vehicle zones', 'Structured mapping from German workshop evidence'], ['Repair recommendation', 'Inspect, repair, paint or replace when supported'], ['Confidence and evidence', 'Every damage stays traceable to the original note']].map(([title, text], index) => <Stack key={title} direction="row" spacing={1.5}><Box sx={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: index === 3 ? 'error.main' : 'grey.900', color: 'common.white', flexShrink: 0, fontSize: 12 }}>{index + 1}</Box><Box><Typography variant="subtitle2">{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box></Stack>)}</Stack></Card></Grid>
    </Grid>
  </DashboardContent>;
}

function needsReview(item: ProcessedDamageCase) { return !item.statusDone && (item.severity === 'schwer' || item.warnings.length > 0 || item.damages.some((damage) => damage.action === 'unknown' || damage.action === 'replace')); }
function priority(item: ProcessedDamageCase) { return (item.severity === 'schwer' ? 4 : 0) + (item.warnings.length ? 3 : 0) + (item.damages.some((damage) => damage.action === 'replace') ? 2 : 0) + (item.damages.some((damage) => damage.action === 'unknown') ? 1 : 0); }
function reason(item: ProcessedDamageCase) { if (item.severity === 'schwer') return 'Heavy damage'; if (item.warnings.length) return 'Extraction warning'; if (item.damages.some((damage) => damage.action === 'replace')) return 'Replacement recommended'; return 'Repair method required'; }
function AttentionRow({ value, label, helper, tone = 'default' }: { value: number; label: string; helper: string; tone?: 'default' | 'warning' | 'error' }) { return <Stack direction="row" spacing={2} sx={{ py: 1.75 }}><Typography variant="h5" color={tone === 'default' ? 'text.primary' : `${tone}.main`} sx={{ minWidth: 54 }}>{value}</Typography><Box><Typography variant="subtitle2">{label}</Typography><Typography variant="caption" color="text.secondary">{helper}</Typography></Box></Stack>; }
function MixBar({ label, value, total, damage }: { label: string; value: number; total: number; damage?: boolean }) { return <Box><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{label}</Typography><Typography variant="body2" fontWeight={700}>{Math.round((value / total) * 100)}%</Typography></Stack><LinearProgress variant="determinate" value={(value / total) * 100} color={damage ? 'error' : 'inherit'} sx={{ mt: 0.75, height: 7 }} /></Box>; }
