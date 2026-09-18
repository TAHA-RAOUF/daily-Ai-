import type { DamageAction } from 'src/types/damage-intelligence';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { formatInsuranceType } from 'src/lib/damage-data';
import { getDamageCaseById } from 'src/lib/server/damage-data';

import { Iconify } from 'src/components/iconify';
import { VehicleDamageViewer } from 'src/components/vehicle-3d';
import { CaseTypeChip, OriginalNote, SeverityChip, ConfidenceIndicator } from 'src/components/damage-intelligence';

type Props = { params: Promise<{ id: string }> };
const sectionSx = { borderRadius: 1.5, borderColor: 'divider' };
const actionLabels: Record<DamageAction, string> = { inspect: 'Inspect', repair: 'Repair', paint: 'Paint', replace: 'Replace', unknown: 'Assessment required' };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const item = await getDamageCaseById(id);
  if (!item) return <DashboardContent maxWidth="xl"><Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}><Typography variant="h5">Case not found</Typography><Typography color="text.secondary" sx={{ my: 1.5 }}>No workshop case matches DA-{id}.</Typography><Button component={RouterLink} href={paths.dashboard.cases}>Return to cases</Button></Card></DashboardContent>;

  const unknownActions = item.damages.filter((damage) => damage.action === 'unknown').length;
  const replacements = item.damages.filter((damage) => damage.action === 'replace').length;
  const viewerDamages = item.damages.map((damage) => ({ ...damage, severity: item.severity, warnings: item.warnings }));

  return <DashboardContent maxWidth="xl">
    <Button component={RouterLink} href={paths.dashboard.cases} size="small" color="inherit" startIcon={<Iconify icon="solar:double-alt-arrow-right-bold-duotone" sx={{ transform: 'rotate(180deg)' }} />} sx={{ alignSelf: 'flex-start', mb: 2 }}>All cases</Button>

    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
      <Box><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Typography variant="overline" color="text.secondary">Case DA-{item.id}</Typography><Chip size="small" variant="outlined" color={item.statusDone ? 'success' : 'warning'} label={item.statusDone ? 'Completed' : 'Open worklist'} /></Stack><Typography component="h1" variant="h3">{item.vehicle.manufacturer} {item.vehicle.model}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{item.vehicle.modelType} · {item.vehicle.firstRegistration.slice(0, 4)} · {item.vehicle.mileage.toLocaleString('en-GB')} km</Typography></Box>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><CaseTypeChip type={item.caseType} /><SeverityChip severity={item.severity} /><Chip size="small" label={item.caseKind} /><Chip size="small" variant="outlined" label={formatInsuranceType(item.insurance)} /></Stack>
    </Stack>

    <Card variant="outlined" sx={{ ...sectionSx, mb: 3, overflow: 'hidden' }}>
      <Grid container>
        <SummaryCell label="Damage zones" value={item.damages.length} helper={item.damages.length ? 'Structured detections' : 'No damage detected'} />
        <SummaryCell label="Extraction confidence" value={`${Math.round(item.overallConfidence * 100)}%`} helper="Location and description" />
        <SummaryCell label="Repair decisions" value={unknownActions ? `${unknownActions} open` : 'Ready'} helper={unknownActions ? 'Require technician assessment' : 'Actions classified'} warning={unknownActions > 0} />
        <SummaryCell label="Workshop load" value={item.operations.workLoadTotal} helper={`${item.operations.orderCount} orders · ${item.operations.workshopTaskCount} tasks`} />
      </Grid>
    </Card>

    {unknownActions > 0 && <Alert severity="warning" icon={<Iconify icon="solar:danger-triangle-bold" />} sx={{ mb: 3 }}><Typography variant="subtitle2">Technician decision required</Typography><Typography variant="body2">The damaged zones are confidently identified, but {unknownActions === 1 ? 'the repair method is' : `${unknownActions} repair methods are`} not classified. Inspect the listed panels before ordering parts or assigning paint work.</Typography></Alert>}
    {item.warnings.length > 0 && <Alert severity="warning" sx={{ mb: 3 }}>{item.warnings.join(' · ')}</Alert>}

    <Box component="section" aria-labelledby="inspect-heading" sx={{ mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}><Box><Typography id="inspect-heading" component="h2" variant="h5">Inspect vehicle damage</Typography><Typography variant="body2" color="text.secondary">Select a marker or zone to review the extraction</Typography></Box><Typography variant="caption" color="text.secondary">Drag to rotate · Scroll to zoom</Typography></Stack><VehicleDamageViewer damages={viewerDamages} /></Box>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 7 }}><Box component="section" aria-labelledby="plan-heading"><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Box><Typography id="plan-heading" component="h2" variant="h5">Repair decision</Typography><Typography variant="body2" color="text.secondary">Turn each extraction into a confirmed workshop action</Typography></Box><Chip size="small" label={`${item.damages.length} zones`} /></Stack>
        <Card variant="outlined" sx={sectionSx}>{item.damages.length ? item.damages.map((damage, index) => <Box key={`${damage.zone}-${index}`}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ p: 2.5 }}><Stack direction="row" spacing={2}><Box sx={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: damage.action === 'unknown' ? 'warning.lighter' : 'grey.200', color: damage.action === 'unknown' ? 'warning.darker' : 'text.primary', borderRadius: '50%', fontWeight: 700, fontSize: 13 }}>{index + 1}</Box><Box><Typography variant="subtitle1">{damage.zone}</Typography><Typography variant="body2" color="text.secondary">{damage.damageType}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Evidence: “{damage.evidence}”</Typography></Box></Stack><Stack alignItems={{ sm: 'flex-end' }} spacing={1}><Chip size="small" color={damage.action === 'unknown' ? 'warning' : damage.action === 'replace' ? 'error' : 'default'} label={actionLabels[damage.action]} /><ConfidenceIndicator value={damage.confidence} compact /></Stack></Stack>{index < item.damages.length - 1 && <Divider />}</Box>) : <Box sx={{ p: 4, textAlign: 'center' }}><Iconify icon="solar:check-circle-bold" width={32} color="success.main" /><Typography variant="subtitle1" sx={{ mt: 1 }}>No vehicle damage detected</Typography><Typography variant="body2" color="text.secondary">Continue with the recorded service workflow.</Typography></Box>}</Card>
        {replacements > 0 && <Alert severity="error" sx={{ mt: 2 }}>{replacements} complete component replacement {replacements === 1 ? 'is' : 'are'} recommended.</Alert>}
      </Box></Grid>

      <Grid size={{ xs: 12, lg: 5 }}><Box component="section" aria-labelledby="source-heading"><Typography id="source-heading" component="h2" variant="h5" sx={{ mb: 1.5 }}>Source evidence</Typography><OriginalNote note={item.note} /></Box></Grid>

      <Grid size={{ xs: 12, lg: 7 }}><Card component="section" variant="outlined" sx={{ ...sectionSx, p: 3 }}><Typography variant="h6">Workshop progress</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>Current operational states from the workshop system</Typography><Stack spacing={0}>{item.states.map((state, index) => <Stack key={`${state.category}-${state.id}`} direction="row" spacing={2} sx={{ position: 'relative', pb: index === item.states.length - 1 ? 0 : 2.5 }}><Box sx={{ width: 12, height: 12, mt: 0.5, borderRadius: '50%', bgcolor: state.isDone ? 'success.main' : index === 0 ? 'warning.main' : 'grey.400', zIndex: 1, flexShrink: 0 }} />{index < item.states.length - 1 && <Box sx={{ position: 'absolute', left: 5.5, top: 14, bottom: 0, width: 1, bgcolor: 'divider' }} />}<Box><Typography variant="subtitle2">{state.name}</Typography><Typography variant="caption" color="text.secondary">{state.category}</Typography></Box></Stack>)}</Stack></Card></Grid>

      <Grid size={{ xs: 12, lg: 5 }}><Card component="section" variant="outlined" sx={{ ...sectionSx, p: 3, height: 1 }}><Typography variant="h6">Case details</Typography><Stack divider={<Divider />} sx={{ mt: 1.5 }}><DetailRow label="Workshop status" value={item.status} /><DetailRow label="Insurance" value={formatInsuranceType(item.insurance)} /><DetailRow label="Orders" value={item.operations.orderCount} /><DetailRow label="Workshop tasks" value={item.operations.workshopTaskCount} /><DetailRow label="Received" value={formatDate(item.receivedAt)} /><DetailRow label="AI processed" value={formatDate(item.processedAt)} /></Stack></Card></Grid>
    </Grid>
  </DashboardContent>;
}

function SummaryCell({ label, value, helper, warning }: { label: string; value: string | number; helper: string; warning?: boolean }) { return <Grid size={{ xs: 6, md: 3 }} sx={{ p: { xs: 2, md: 2.5 }, borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', '&:nth-of-type(2n)': { borderRight: { xs: 0, md: 1 } }, '&:last-of-type': { borderRight: 0 } }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" color={warning ? 'warning.main' : 'text.primary'} sx={{ mt: 0.25 }}>{value}</Typography><Typography variant="caption" color="text.secondary">{helper}</Typography></Grid>; }
function DetailRow({ label, value }: { label: string; value: string | number }) { return <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1.25 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography></Stack>; }
function formatDate(value: string) { const normalized = value.includes('T') ? value : value.replace(' ', 'T'); const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }
