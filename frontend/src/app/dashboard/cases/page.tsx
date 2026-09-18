import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { getDamageCases } from 'src/lib/server/damage-data';

import { CasesTable } from './cases-table';

export const metadata = { title: `Cases - ${CONFIG.appName}` };

export default async function Page() {
  const cases = await getDamageCases();
  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4">Cases</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>Search and triage workshop records and extracted vehicle damage</Typography>
      <Card variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 1.5 }}><CasesTable cases={cases} /></Card>
    </DashboardContent>
  );
}
