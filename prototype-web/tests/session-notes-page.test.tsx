import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionNotesPage from '@/pages/clinician/SessionNotesPage';

vi.mock('@/api/clinician', () => ({
  clinicianApi: {
    getSessionNotes: vi.fn(),
    createSessionNote: vi.fn(),
    signSessionNote: vi.fn(),
  },
}));

import { clinicianApi } from '@/api/clinician';

describe('SessionNotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills the note form from an approved draft seed', async () => {
    (clinicianApi.getSessionNotes as ReturnType<typeof vi.fn>).mockResolvedValueOnce([[], null]);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/clinician/patients/patient-1/session-notes',
            state: {
              draftSeed: {
                sourceDraftId: 'draft-1',
                subjective: 'Patient reports reduced panic episodes this week.',
                objective: 'Observed calmer presentation and improved engagement.',
                assessment: 'Symptoms appear to be improving with current supports.',
                plan: 'Continue exposure practice and review progress next session.',
              },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/clinician/patients/:patientId/session-notes" element={<SessionNotesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('New Session Note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Patient reports reduced panic episodes this week.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Observed calmer presentation and improved engagement.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Symptoms appear to be improving with current supports.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Continue exposure practice and review progress next session.')).toBeInTheDocument();
  });
});