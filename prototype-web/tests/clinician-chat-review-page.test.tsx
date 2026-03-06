import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatReviewPage from '@/pages/clinician/ChatReviewPage';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';

vi.mock('@/api/clinician', () => ({
  clinicianApi: {
    getChatSessions: vi.fn(),
    getChatSummaries: vi.fn(),
    getChatSession: vi.fn(),
    getChatSummary: vi.fn(),
    summarizeChatSession: vi.fn(),
    reviewChatSummary: vi.fn(),
  },
}));

const mockedClinicianApi = clinicianApi as unknown as {
  getChatSessions: ReturnType<typeof vi.fn>;
  getChatSummaries: ReturnType<typeof vi.fn>;
  getChatSession: ReturnType<typeof vi.fn>;
  getChatSummary: ReturnType<typeof vi.fn>;
  summarizeChatSession: ReturnType<typeof vi.fn>;
  reviewChatSummary: ReturnType<typeof vi.fn>;
};

describe('ChatReviewPage', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });

    mockedClinicianApi.getChatSessions.mockResolvedValue([
      [
        {
          id: 'session-1',
          patientId: 'patient-1',
          active: false,
          messageCount: 2,
          durationMinutes: 12,
          latestSummary: {
            id: 'summary-1',
            status: 'DRAFT',
            createdAt: '2026-03-06T12:00:00.000Z',
          },
          createdAt: '2026-03-06T11:00:00.000Z',
          updatedAt: '2026-03-06T11:12:00.000Z',
        },
      ],
      null,
    ]);
    mockedClinicianApi.getChatSummaries.mockResolvedValue([
      [
        {
          id: 'summary-1',
          sessionId: 'session-1',
          status: 'DRAFT',
          modelVersion: 'claude-test',
          reviewedBy: null,
          reviewedAt: null,
          sessionCreatedAt: '2026-03-06T11:00:00.000Z',
          createdAt: '2026-03-06T12:00:00.000Z',
        },
      ],
      null,
    ]);
    mockedClinicianApi.getChatSummary.mockResolvedValue([
      {
        id: 'summary-1',
        sessionId: 'session-1',
        patientId: 'patient-1',
        clinicianSummary: 'Patient reports escalating anxiety before work meetings.',
        recommendations: [
          {
            title: 'Reinforce breathing routine',
            description: 'Encourage reuse of the 4-7-8 breathing routine before presentations.',
            reasoning: 'Patient already describes benefit from this coping skill.',
            evidenceCitations: ['APA Anxiety Guideline'],
            signalBand: 'MODERATE',
            category: 'coping',
          },
        ],
        evidenceLog: [],
        patternFlags: [],
        riskIndicators: [],
        unknowns: [],
        modelVersion: 'claude-test',
        tokenUsage: {},
        status: 'DRAFT',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        session: {
          createdAt: '2026-03-06T11:00:00.000Z',
          active: false,
          messageCount: 2,
        },
        createdAt: '2026-03-06T12:00:00.000Z',
        updatedAt: '2026-03-06T12:00:00.000Z',
      },
      null,
    ]);
    mockedClinicianApi.getChatSession.mockResolvedValue([
      {
        id: 'session-1',
        patientId: 'patient-1',
        active: false,
        messages: [
          {
            id: 'message-1',
            role: 'USER',
            content: 'I get very anxious before meetings.',
            createdAt: '2026-03-06T11:00:00.000Z',
          },
          {
            id: 'message-2',
            role: 'ASSISTANT',
            content: 'Let us revisit the breathing strategy that helped last week.',
            createdAt: '2026-03-06T11:05:00.000Z',
          },
        ],
        summaries: [
          {
            id: 'summary-1',
            status: 'DRAFT',
            createdAt: '2026-03-06T12:00:00.000Z',
          },
        ],
        createdAt: '2026-03-06T11:00:00.000Z',
        updatedAt: '2026-03-06T11:12:00.000Z',
      },
      null,
    ]);
    mockedClinicianApi.summarizeChatSession.mockResolvedValue([{ id: 'summary-2', status: 'DRAFT' }, null]);
    mockedClinicianApi.reviewChatSummary.mockResolvedValue([
      {
        id: 'summary-1',
        status: 'APPROVED',
        reviewedAt: '2026-03-06T12:30:00.000Z',
      },
      null,
    ]);
  });

  it('loads transcripts and allows approving a clinician chat summary', async () => {
    render(
      <MemoryRouter initialEntries={['/clinician/patients/patient-1/chat-review']}>
        <Routes>
          <Route path="/clinician/patients/:patientId/chat-review" element={<ChatReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Chat Review')).toBeInTheDocument();
    expect(await screen.findByText(/Patient reports escalating anxiety before work meetings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view transcript/i }));

    expect(await screen.findByText(/I get very anxious before meetings/i)).toBeInTheDocument();
    expect(screen.getByText(/Let us revisit the breathing strategy/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/review notes/i), {
      target: { value: 'Clinically appropriate and aligned with prior sessions.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /approve summary/i }));

    await waitFor(() => {
      expect(mockedClinicianApi.reviewChatSummary).toHaveBeenCalledWith('patient-1', 'summary-1', {
        action: 'APPROVED',
        notes: 'Clinically appropriate and aligned with prior sessions.',
      });
    });
  });
});