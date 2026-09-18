'use client';

import type { ProcessedDamageCase } from 'src/types/damage-intelligence';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { CaseTypeChip, SeverityChip, ConfidenceIndicator } from 'src/components/damage-intelligence';

const all = 'all';

export function CasesTable({ cases }: { cases: ProcessedDamageCase[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState(all);
  const [severity, setSeverity] = useState(all);
  const [status, setStatus] = useState(all);
  const [kind, setKind] = useState(all);
  const [insurance, setInsurance] = useState(all);
  const [manufacturer, setManufacturer] = useState(all);
  const [zone, setZone] = useState(all);

  const options = useMemo(() => ({
    kinds: [...new Set(cases.map((item) => item.caseKind))].sort(),
    insurance: [...new Set(cases.map((item) => item.insurance ?? 'unknown'))].sort(),
    manufacturers: [...new Set(cases.map((item) => item.vehicle.manufacturer))].sort(),
    statuses: [...new Set(cases.map((item) => item.status))].sort(),
    zones: [...new Set(cases.flatMap((item) => item.damages.map((damage) => damage.zone)))].sort(),
  }), [cases]);

  const rows = useMemo(() => cases.filter((item) => {
    const term = search.toLowerCase();
    return (type === all || item.caseType === type) &&
      (severity === all || (item.severity ?? 'unknown') === severity) &&
      (status === all || item.status === status) &&
      (kind === all || item.caseKind === kind) &&
      (insurance === all || (item.insurance ?? 'unknown') === insurance) &&
      (manufacturer === all || item.vehicle.manufacturer === manufacturer) &&
      (zone === all || item.damages.some((damage) => damage.zone === zone)) &&
      (!term || `da-${item.id} ${item.vehicle.manufacturer} ${item.vehicle.model} ${item.caseKind} ${item.note}`.toLowerCase().includes(term));
  }), [cases, insurance, kind, manufacturer, search, severity, status, type, zone]);

  const columns: GridColDef<ProcessedDamageCase>[] = [
    { field: 'id', headerName: 'Case ID', width: 110, valueFormatter: (value) => `DA-${value}` },
    { field: 'vehicle', headerName: 'Vehicle', minWidth: 190, flex: 1, valueGetter: (_, row) => `${row.vehicle.manufacturer} ${row.vehicle.model}` },
    { field: 'caseType', headerName: 'Case type', width: 115, renderCell: ({ row }) => <CaseTypeChip type={row.caseType} /> },
    { field: 'caseKind', headerName: 'Case kind', minWidth: 145, flex: 0.7 },
    { field: 'severity', headerName: 'Severity', width: 115, renderCell: ({ row }) => <SeverityChip severity={row.severity} /> },
    { field: 'damages', headerName: 'Damage zones', minWidth: 210, flex: 1, sortable: false, valueGetter: (_, row) => row.damages.map((damage) => damage.zone).join(', ') || '—' },
    { field: 'status', headerName: 'Current status', width: 130 },
    { field: 'overallConfidence', headerName: 'Confidence', width: 125, renderCell: ({ row }) => <ConfidenceIndicator value={row.overallConfidence} compact /> },
    { field: 'action', headerName: '', width: 90, sortable: false, filterable: false, renderCell: ({ row }) => <Button size="small" onClick={(event) => { event.stopPropagation(); router.push(paths.dashboard.caseDetails(row.id)); }}>View</Button> },
  ];

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} useFlexGap flexWrap="wrap" spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" label="Search cases" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: 240, flex: 1 }} />
        <TextField select size="small" label="Case type" value={type} onChange={(event) => setType(event.target.value)} sx={{ minWidth: 140 }}><MenuItem value={all}>All types</MenuItem><MenuItem value="damage">Damage</MenuItem><MenuItem value="service">Service</MenuItem></TextField>
        <TextField select size="small" label="Severity" value={severity} onChange={(event) => setSeverity(event.target.value)} sx={{ minWidth: 140 }}><MenuItem value={all}>All severities</MenuItem><MenuItem value="leicht">Light</MenuItem><MenuItem value="mittel">Medium</MenuItem><MenuItem value="schwer">Heavy</MenuItem><MenuItem value="unknown">Unknown</MenuItem></TextField>
        <TextField select size="small" label="Case kind" value={kind} onChange={(event) => setKind(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value={all}>All kinds</MenuItem>{options.kinds.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select size="small" label="Insurance" value={insurance} onChange={(event) => setInsurance(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value={all}>All insurance</MenuItem>{options.insurance.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select size="small" label="Manufacturer" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value={all}>All manufacturers</MenuItem>{options.manufacturers.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select size="small" label="Damage zone" value={zone} onChange={(event) => setZone(event.target.value)} sx={{ minWidth: 190 }}><MenuItem value={all}>All zones</MenuItem>{options.zones.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}><MenuItem value={all}>All statuses</MenuItem>{options.statuses.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      </Stack>
      <DataGrid rows={rows} columns={columns} onRowClick={({ row }) => router.push(paths.dashboard.caseDetails(row.id))} disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} localeText={{ noRowsLabel: 'No cases match the selected filters' }} sx={{ minHeight: 540, borderRadius: 1.5, '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
    </Box>
  );
}
