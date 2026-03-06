import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatientProfilePage from '@/pages/clinician/PatientProfilePage';

vi.mock('recharts', async () => {
  const React = await import('react');

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="signal-history-chart">{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CartesianGrid: () => null,
    ReferenceLine: () => null,
    Line: () => null,
    Tooltip: () => null,
    XAxis: ({ tickFormatter }: { tickFormatter?: (value: string) => string }) => (
      <div>{tickFormatter ? tickFormatter('Mar 6') : 'Mar 6'}</div>
    ),
    YAxis: ({ ticks, tickFormatter }: { ticks?: number[]; tickFormatter?: (value: number) => string }) => (
      <div>
        {ticks?.map((tick) => (
          <span key={tick}>{tickFormatter ? tickFormatter(tick) : tick}</span>
        ))}
      </div>
    ),
  };
});

vi.mock('@/api/clinician', () => ({
  clinicianApi: {
    getPatientProfile: vi.fn(),
  },
}));

vi.mock('@/api/patients', () => ({
  patientApi: {
    getDemographics: vi.fn(),
    getEmergencyContacts: vi.fn(),
    getMedications: vi.fn(),
    getAllergies: vi.fn(),
    getDiagnoses: vi.fn(),
  },
}));

import { clinicianApi } from '@/api/clinician';

describe('PatientProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the signal history trend for clinician review', async () => {
    (clinicianApi.getPatientProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        patient: {
          id: 'patient-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          firstName: 'Alex',
          lastName: 'Jones',
          signalBand: 'MODERATE',
          submissionCount: 3,
        },
        recentCheckins: [],
        recentJournals: [],
        triageItems: [],
        drafts: [],
        signalHistory: [
          { band: 'LOW', date: '2026-03-01T10:00:00.000Z' },
          { band: 'MODERATE', date: '2026-03-03T10:00:00.000Z' },
          { band: 'ELEVATED', date: '2026-03-06T10:00:00.000Z' },
        ],
      },
      null,
    ]);

    render(
      <MemoryRouter initialEntries={['/clinician/patients/patient-1']}>
        <Routes>
          <Route path="/clinician/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Signal History')).toBeInTheDocument();
    expect(screen.getByTestId('signal-history-chart')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('GUARDED')).toBeInTheDocument();
    expect(screen.getAllByText('MODERATE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ELEVATED').length).toBeGreaterThan(0);
    expect(screen.getByText('Observations')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });
});