import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

export function ConfidenceIndicator({ value, compact = false }: { value: number; compact?: boolean }) {
  const normalized = Math.max(0, Math.min(1, value));
  const status = normalized >= 0.85 ? 'High' : normalized >= 0.65 ? 'Medium' : 'Low';
  const color = normalized >= 0.85 ? 'success' : normalized >= 0.65 ? 'warning' : 'error';
  return (
    <Stack spacing={0.5} sx={{ minWidth: compact ? 90 : 140 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        {!compact && <Typography variant="caption" color="text.secondary">{status}</Typography>}
        <Typography variant="caption" fontWeight={700}>{Math.round(normalized * 100)}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={normalized * 100} color={color} sx={{ height: 5, borderRadius: 0.5 }} aria-label={`${status} confidence, ${Math.round(normalized * 100)} percent`} />
    </Stack>
  );
}
