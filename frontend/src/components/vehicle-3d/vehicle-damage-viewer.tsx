'use client';

import type { VehicleDamage } from './types';
import type { DamageAction } from 'src/types/damage-intelligence';

import dynamic from 'next/dynamic';
import { useState, Component, type ErrorInfo, type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

import { severityColor } from './vehicle-zone-map';

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false, loading: () => <Fallback text="Loading 3D vehicle…" /> });
const actionLabels: Record<DamageAction, string> = { inspect: 'Inspect', repair: 'Repair', paint: 'Paint', replace: 'Replace', unknown: 'Assessment required' };

export function VehicleDamageViewer({ damages }: { damages: VehicleDamage[] }) {
  const [selected, setSelected] = useState<number | null>(damages.length ? 0 : null);
  const [visible, setVisible] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const active = selected === null ? null : damages[selected];

  return <Box sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 1.5, overflow: 'hidden' }}>
    <Grid container>
      <Grid size={{ xs: 12, lg: 8 }} sx={{ borderRight: { lg: 1 }, borderColor: 'divider' }}>
        <Box sx={{ height: { xs: 340, sm: 440, lg: 540 }, bgcolor: 'grey.100', position: 'relative' }}><ViewerBoundary fallback={<Fallback text="3D model unavailable. Use the damage list to continue the assessment." />}><SceneCanvas damages={damages} selected={selected} markersVisible={visible} resetKey={resetKey} onSelect={setSelected} /></ViewerBoundary>
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none' }}><Chip size="small" label="360° view" sx={{ bgcolor: 'background.paper' }} /><Chip size="small" label={`${damages.length} ${damages.length === 1 ? 'zone' : 'zones'}`} sx={{ bgcolor: 'background.paper' }} /></Stack>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}><Stack direction="row" spacing={0.5}><Button size="small" color="inherit" startIcon={<Iconify icon="solar:restart-bold" />} onClick={() => setResetKey((value) => value + 1)}>Reset view</Button><Button size="small" color="inherit" startIcon={<Iconify icon="solar:eye-bold" />} onClick={() => setSelected(null)}>Show all</Button></Stack><FormControlLabel sx={{ m: 0 }} control={<Switch size="small" checked={visible} onChange={(_, checked) => setVisible(checked)} />} label={<Typography variant="body2">Show markers</Typography>} /></Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}><Box sx={{ p: { xs: 2, md: 2.5 } }}><Typography variant="overline" color="text.secondary">Detected areas</Typography>{damages.length === 0 ? <Stack alignItems="center" textAlign="center" sx={{ py: 6 }}><Iconify icon="solar:check-circle-bold" width={38} color="success.main" /><Typography variant="subtitle1" sx={{ mt: 1.5 }}>No vehicle damage detected</Typography><Typography variant="body2" color="text.secondary">The vehicle remains available for 360° inspection.</Typography></Stack> : <Stack spacing={0.75} sx={{ mt: 1 }}>{damages.map((damage, index) => { const current = selected === index; return <Button key={`${damage.zone}-${index}`} color="inherit" onClick={() => setSelected(index)} aria-pressed={current} sx={{ p: 1.25, justifyContent: 'flex-start', border: 1, borderColor: current ? 'text.primary' : 'divider', bgcolor: current ? 'grey.100' : 'transparent', textAlign: 'left' }}><Box sx={{ width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: severityColor(damage.severity), color: 'common.white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{index + 1}</Box><Box sx={{ ml: 1.25, minWidth: 0 }}><Typography variant="subtitle2" noWrap>{damage.zone}</Typography><Typography variant="caption" color="text.secondary">{actionLabels[damage.action]}</Typography></Box><Typography variant="caption" fontWeight={700} sx={{ ml: 'auto' }}>{Math.round(damage.confidence * 100)}%</Typography></Button>; })}</Stack>}

        {active && <Box sx={{ mt: 2.5 }}><Divider sx={{ mb: 2.5 }} /><Stack direction="row" justifyContent="space-between" spacing={1}><Box><Typography variant="overline" color="text.secondary">Selected damage</Typography><Typography variant="h6">{active.zone}</Typography></Box><Chip size="small" color={active.action === 'unknown' ? 'warning' : active.action === 'replace' ? 'error' : 'default'} label={actionLabels[active.action]} /></Stack><Typography variant="body2" sx={{ mt: 1 }}>{active.damageType}</Typography><Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderLeft: 3, borderColor: 'grey.500' }}><Typography variant="caption" color="text.secondary">Original evidence</Typography><Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>“{active.evidence}”</Typography></Box>{active.action === 'unknown' && <Typography variant="body2" color="warning.darker" sx={{ mt: 2 }}><strong>Next step:</strong> Inspect the panel and confirm repair, paint or replacement before scheduling.</Typography>}{active.action === 'replace' && <Typography variant="body2" color="error.main" fontWeight={700} sx={{ mt: 2 }}>Complete component replacement recommended</Typography>}</Box>}

        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1.5} sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>{(['leicht', 'mittel', 'schwer', null] as const).map((severity) => <Stack key={severity ?? 'unknown'} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: severityColor(severity) }} /><Typography variant="caption">{severity === 'leicht' ? 'Light' : severity === 'mittel' ? 'Medium' : severity === 'schwer' ? 'Heavy' : 'Unknown'}</Typography></Stack>)}</Stack>
      </Box></Grid>
    </Grid>
  </Box>;
}

function Fallback({ text }: { text: string }) { return <Box role="status" sx={{ width: 1, height: 1, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{text}</Typography></Box>; }
class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } componentDidCatch(error: Error, info: ErrorInfo) { console.error('Vehicle viewer failed', error, info); } render() { return this.state.failed ? this.props.fallback : this.props.children; } }
