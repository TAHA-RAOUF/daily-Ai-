import type { Severity } from 'src/types/damage-intelligence';

import Chip from '@mui/material/Chip';

const labels: Record<NonNullable<Severity>, string> = { leicht: 'Light', mittel: 'Medium', schwer: 'Heavy' };

export function SeverityChip({ severity }: { severity: Severity }) {
  const color = severity === 'schwer' ? 'error' : severity === 'mittel' ? 'warning' : severity === 'leicht' ? 'success' : 'default';
  return <Chip size="small" variant="soft" color={color} label={severity ? labels[severity] : 'Unknown'} />;
}
