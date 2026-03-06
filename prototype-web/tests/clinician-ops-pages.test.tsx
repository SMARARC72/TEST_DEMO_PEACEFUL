import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TriageInboxPage from '@/pages/clinician/TriageInboxPage';
import ExportsCenterPage from '@/pages/clinician/ExportsCenterPage';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';

vi.mock('@/api/clinician', () => ({
  clinicianApi: {
    getTriage: vi.fn(),
    patchTriage: vi.fn(),
    getExports: vi.fn(),
    createExport: vi.fn(),
  },
}));

vi.mock('@/utils/pdfExport', () => ({
  downloadPatientPdf: vi.fn(),
}));

const mockedClinicianApi = clinicianApi as unknown as {
  getTriage: ReturnType<typeof vi.fn>;
  patchTriage: ReturnType<typeof vi.fn>;
  getExports: ReturnType<typeof vi.fn>;
  createExport: ReturnType<typeof vi.fn>;
};

describe('Clinician operational pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toasts: [] });
  });

  it('waits for bulk acknowledge operations before refreshing triage', async () => {
    mockedClinicianApi.getTriage
      .mockResolvedValueOnce([
        {
          data: [
            {
              id: 'triage-1',
              patientId: 'patient-1',
              signalBand: 'ELEVATED',
              status: 'NEW',
              summary: 'Patient reports acute anxiety.',
              createdAt: '2026-03-06T10:00:00.000Z',
              patient: {
                user: { firstName: 'Alex', lastName: 'Jones' },
              },
              severity: 'HIGH',
            },
            {
              id: 'triage-2',
              patientId: 'patient-2',
              signalBand: 'MODERATE',
              status: 'NEW',
              summary: 'Patient reports sleep disruption.',
              createdAt: '2026-03-06T11:00:00.000Z',
              patient: {
                user: { firstName: 'Sam', lastName: 'Lee' },
              },
              severity: 'MODERATE',
            },
          ],
        },
        null,
      ])
      .mockResolvedValueOnce([{ data: [] }, null]);
    mockedClinicianApi.patchTriage.mockResolvedValue([{}, null]);

    render(
      <MemoryRouter initialEntries={['/clinician/triage']}>
        <Routes>
          <Route path="/clinician/triage" element={<TriageInboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
    fireEvent.click(screen.getByRole('button', { name: /bulk acknowledge/i }));

    await waitFor(() => {
      expect(mockedClinicianApi.patchTriage).toHaveBeenCalledTimes(2);
      expect(mockedClinicianApi.getTriage).toHaveBeenCalledTimes(2);
    });
  });

  it('polls export status while jobs are generating', async () => {
    vi.useFakeTimers();

    mockedClinicianApi.getExports
      .mockResolvedValueOnce([
        [
          {
            id: 'export-1',
            patientId: 'patient-1',
            profile: 'STANDARD',
            status: 'GENERATING',
            format: 'JSON',
            requestedBy: 'clinician-1',
            createdAt: '2026-03-06T10:00:00.000Z',
          },
        ],
        null,
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 'export-1',
            patientId: 'patient-1',
            profile: 'STANDARD',
            status: 'READY',
            format: 'JSON',
            requestedBy: 'clinician-1',
            createdAt: '2026-03-06T10:00:00.000Z',
            completedAt: '2026-03-06T10:01:00.000Z',
          },
        ],
        null,
      ]);

    try {
      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/clinician/patients/patient-1/exports']}>
            <Routes>
              <Route path="/clinician/patients/:patientId/exports" element={<ExportsCenterPage />} />
            </Routes>
          </MemoryRouter>,
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockedClinicianApi.getExports).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/refreshing export statuses automatically/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
        await Promise.resolve();
      });

      expect(mockedClinicianApi.getExports).toHaveBeenCalledTimes(2);
      expect(screen.getByText('READY')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});