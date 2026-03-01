// ─── Domain Component Tests ──────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SignalBadge } from '@/components/domain/SignalBadge';
import { PatientCard } from '@/components/domain/PatientCard';
import { TriageCard } from '@/components/domain/TriageCard';
import { DraftViewer } from '@/components/domain/DraftViewer';
import type { CaseloadPatient, TriageItem, AIDraft } from '@/api/types';

// ─── SignalBadge ─────────────────────────────

describe('SignalBadge', () => {
  it('renders LOW band as green', () => {
    render(<SignalBadge band="LOW" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders ELEVATED band as danger', () => {
    render(<SignalBadge band="ELEVATED" />);
    expect(screen.getByText('Elevated')).toBeInTheDocument();
  });

  it('renders MODERATE band', () => {
    render(<SignalBadge band="MODERATE" />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders GUARDED band', () => {
    render(<SignalBadge band="GUARDED" />);
    expect(screen.getByText('Guarded')).toBeInTheDocument();
  });
});

// ─── PatientCard ─────────────────────────────

describe('PatientCard', () => {
  const entry: CaseloadPatient = {
    id: 'cp-1',
    patientId: 'p-1',
    patient: {
      id: 'p-1',
      user: { firstName: 'Alex', lastName: 'Rivera' },
      triageItems: [
        { id: 't1', patientId: 'p-1', signalBand: 'LOW', status: 'RESOLVED', summary: '', source: 'CHECKIN', createdAt: '2026-01-01' },
      ],
      submissions: [{ createdAt: '2026-01-15' }],
    },
  };

  it('renders patient name', () => {
    render(
      <MemoryRouter>
        <PatientCard entry={entry} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
  });

  it('shows signal badge', () => {
    render(
      <MemoryRouter>
        <PatientCard entry={entry} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('links to patient profile', () => {
    render(
      <MemoryRouter>
        <PatientCard entry={entry} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/clinician/patients/p-1');
  });
});

// ─── TriageCard ──────────────────────────────

describe('TriageCard', () => {
  const item: TriageItem = {
    id: 'triage-1',
    patientId: 'p-2',
    signalBand: 'MODERATE',
    status: 'NEW',
    summary: 'Elevated stress indicators detected.',
    source: 'CHECKIN',
    createdAt: '2026-02-01',
    patient: { user: { firstName: 'Jordan', lastName: 'Lee' } },
  };

  it('renders patient name', () => {
    render(<TriageCard item={item} />);
    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
  });

  it('shows signal badge and status', () => {
    render(<TriageCard item={item} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows acknowledge button for NEW items', () => {
    const onAck = vi.fn();
    render(<TriageCard item={item} onAcknowledge={onAck} />);
    const btn = screen.getByRole('button', { name: 'Acknowledge' });
    fireEvent.click(btn);
    expect(onAck).toHaveBeenCalledWith('triage-1');
  });

  it('shows resolve button for ACK items', () => {
    const onResolve = vi.fn();
    const ackItem = { ...item, status: 'ACK' as const };
    render(<TriageCard item={ackItem} onResolve={onResolve} />);
    const btn = screen.getByRole('button', { name: 'Resolve' });
    fireEvent.click(btn);
    expect(onResolve).toHaveBeenCalledWith('triage-1');
  });
});

// ─── DraftViewer ─────────────────────────────

describe('DraftViewer', () => {
  const draft: AIDraft = {
    id: 'draft-1',
    patientId: 'p-1',
    format: 'progress_note',
    status: 'DRAFT',
    output: { content: 'Patient shows improvement in anxiety metrics.' },
    createdAt: '2026-02-15',
  };

  it('renders draft content', () => {
    render(<DraftViewer draft={draft} />);
    expect(screen.getByText('Patient shows improvement in anxiety metrics.')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<DraftViewer draft={draft} />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('shows action buttons for DRAFT status', () => {
    const onAction = vi.fn();
    render(<DraftViewer draft={draft} onAction={onAction} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeInTheDocument();
  });

  it('calls onAction with APPROVED', () => {
    const onAction = vi.fn();
    render(<DraftViewer draft={draft} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onAction).toHaveBeenCalledWith('draft-1', 'APPROVED', undefined);
  });

  it('hides action buttons for non-DRAFT status', () => {
    const approved = { ...draft, status: 'APPROVED' as const };
    render(<DraftViewer draft={approved} onAction={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
