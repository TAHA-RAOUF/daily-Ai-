import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type Props = { title: string; value: string | number; subtitle?: string; trend?: string; icon: ReactNode };

export function MetricCard({ title, value, subtitle, trend, icon }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, height: 1, borderRadius: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>{value}</Typography>
        </Box>
        <Box sx={{ color: 'error.main', display: 'flex', pt: 0.5 }}>{icon}</Box>
      </Stack>
      {(subtitle || trend) && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          {trend && <Typography variant="caption" color="success.main">{trend}</Typography>}
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Stack>
      )}
    </Card>
  );
}
