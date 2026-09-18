import type { DamageExtraction } from 'src/types/damage-intelligence';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { ConfidenceIndicator } from './confidence-indicator';

const actionLabels: Record<DamageExtraction['action'], string> = { inspect: 'Inspect', repair: 'Repair', paint: 'Paint', replace: 'Replace', unknown: 'Unknown' };

export function DamageCard({ damage, index }: { damage: DamageExtraction; index?: number }) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, borderTop: 3, borderTopColor: damage.action === 'replace' ? 'error.main' : 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">Damage {index ? String(index).padStart(2, '0') : ''}</Typography>
          <Typography variant="h6">{damage.zone}</Typography>
          <Typography variant="body2" color="text.secondary">{damage.damageType}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Chip size="small" label={actionLabels[damage.action]} color={damage.action === 'replace' ? 'error' : damage.action === 'unknown' ? 'warning' : 'default'} />
          <ConfidenceIndicator value={damage.confidence} compact />
        </Stack>
      </Stack>
      {damage.action === 'replace' && <Alert severity="error" sx={{ mt: 2 }}>Complete component replacement recommended</Alert>}
      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">Exact evidence</Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>“{damage.evidence}”</Typography>
    </Card>
  );
}
