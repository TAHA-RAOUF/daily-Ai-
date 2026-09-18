import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function OriginalNote({ note }: { note: string }) {
  return (
    <Box sx={{ p: 2.5, bgcolor: 'grey.900', color: 'common.white', borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'grey.500' }}>Original workshop note · German</Typography>
      <Typography component="pre" variant="body2" sx={{ mt: 1, m: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8 }}>{note}</Typography>
    </Box>
  );
}
