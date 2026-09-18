import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { AnalyzeForm } from './analyze-form';

export const metadata = { title: `Analyze note - ${CONFIG.appName}` };

export default function Page() {
  return <DashboardContent maxWidth="xl"><AnalyzeForm /></DashboardContent>;
}
