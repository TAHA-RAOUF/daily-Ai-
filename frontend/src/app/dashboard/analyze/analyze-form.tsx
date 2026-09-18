'use client';

import type { CaseKind, CaseType, Severity, InsuranceType, DamageExtraction } from 'src/types/damage-intelligence';

import { useState, type FormEvent } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { formatInsuranceType } from 'src/lib/damage-data';

import { VehicleDamageViewer } from 'src/components/vehicle-3d';
import { DamageCard, CaseTypeChip, SeverityChip, ConfidenceIndicator } from 'src/components/damage-intelligence';

type AnalysisResult = { caseType: CaseType; caseKind: CaseKind; severity: Severity; insurance: InsuranceType; damages: DamageExtraction[]; overallConfidence: number; warnings: string[] };
type ApiAnalysis = Omit<AnalysisResult, 'insurance' | 'damages' | 'overallConfidence'> & { insuranceType: InsuranceType; damages: (Omit<DamageExtraction, 'evidence'> & { evidenceGerman: string })[] };
const exampleNote = 'Kunde bringt Fzg., Vandalismus. Fahrertür Beule, punktuell, mehrere Stellen. Weiterer Schaden Stoßstange hinten, Delle mit Lackschaden.';

export function AnalyzeForm() {
  const [caseId, setCaseId] = useState('1050');
  const [note, setNote] = useState(exampleNote);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const response = await fetch('/api/analyze-damage/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: Number(caseId), freitext: note }) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(readError(body) || `Analysis failed (${response.status})`);
      const data = (body as { data: ApiAnalysis }).data;
      const damages = data.damages.map(({ evidenceGerman, ...damage }) => ({ ...damage, evidence: evidenceGerman }));
      setResult({ ...data, insurance: data.insuranceType, damages, overallConfidence: damages.length ? damages.reduce((sum, damage) => sum + damage.confidence, 0) / damages.length : 1 });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Analysis failed. Please try again later.');
    } finally { setLoading(false); }
  }

  return (
    <Box>
      <Typography variant="h4">Analyze workshop note</Typography><Typography color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>Send one German workshop note to the existing extraction endpoint</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}><Card component="form" onSubmit={submit} variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Stack spacing={2.5}><TextField label="Case ID" type="number" required value={caseId} onChange={(event) => setCaseId(event.target.value)} inputProps={{ min: 1 }} /><TextField label="German workshop note" required multiline minRows={10} value={note} onChange={(event) => setNote(event.target.value)} helperText="The example is prefilled but will not be submitted automatically." /><Button type="submit" variant="contained" color="error" disabled={loading || !note.trim() || !caseId}>{loading ? 'Analyzing…' : 'Analyze note'}</Button>{error && <Alert severity="error">{error}</Alert>}</Stack></Card></Grid>
        <Grid size={{ xs: 12, lg: 7 }}>{!result ? <Card variant="outlined" sx={{ minHeight: 380, p: 4, borderRadius: 1.5, display: 'grid', placeItems: 'center', textAlign: 'center' }}><Box><Typography variant="h6">Structured analysis will appear here</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Submit only when needed to avoid competing with the active batch process.</Typography></Box></Card> : <ResultView result={result} />}</Grid>
      </Grid>
    </Box>
  );
}

function ResultView({ result }: { result: AnalysisResult }) {
  return <Stack spacing={2}><Card variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><CaseTypeChip type={result.caseType} /><SeverityChip severity={result.severity} /></Stack><Grid container spacing={2} sx={{ mt: 1 }}><Grid size={{ xs: 6, sm: 4 }}><LabelValue label="Case kind" value={result.caseKind} /></Grid><Grid size={{ xs: 6, sm: 4 }}><LabelValue label="Insurance" value={formatInsuranceType(result.insurance)} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Confidence</Typography><ConfidenceIndicator value={result.overallConfidence} /></Grid></Grid>{result.warnings?.length > 0 && <Alert severity="warning" sx={{ mt: 2 }}>{result.warnings.join(' · ')}</Alert>}</Card><VehicleDamageViewer damages={result.damages.map((damage) => ({ ...damage, severity: result.severity, warnings: result.warnings }))} />{result.damages?.length ? result.damages.map((damage, index) => <DamageCard key={`${damage.zone}-${index}`} damage={damage} index={index + 1} />) : <Alert severity="info">No damage records were extracted.</Alert>}</Stack>;
}

function LabelValue({ label, value }: { label: string; value: string }) { return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="subtitle2">{value}</Typography></Box>; }
function readError(value: unknown) { if (typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string') return value.error; return ''; }
