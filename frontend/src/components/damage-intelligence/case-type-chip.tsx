import type { CaseType } from 'src/types/damage-intelligence';

import Chip from '@mui/material/Chip';

export function CaseTypeChip({ type }: { type: CaseType }) {
  return <Chip size="small" variant={type === 'damage' ? 'filled' : 'outlined'} color={type === 'damage' ? 'error' : 'default'} label={type === 'damage' ? 'Damage' : 'Service'} />;
}
