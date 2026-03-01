// ─── Snapshot Tests for Key UI + Domain Components ───────────────────
// PRD Gate 3: Inline snapshots for Badge, Card, SignalBadge, Button.
// Catches unexpected visual regressions.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';

// ── Helper: render to HTML string for snapshot ──
function renderHTML(ui: React.ReactElement) {
  const { container } = render(ui, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
  return container.innerHTML;
}

describe('Snapshot: Badge', () => {
  it('default variant', () => {
    const html = renderHTML(<Badge>Default</Badge>);
    expect(html).toContain('Default');
    expect(html).toMatchSnapshot();
  });

  it('success variant', () => {
    const html = renderHTML(<Badge variant="success">Active</Badge>);
    expect(html).toContain('Active');
    expect(html).toMatchSnapshot();
  });

  it('danger variant', () => {
    const html = renderHTML(<Badge variant="danger">Critical</Badge>);
    expect(html).toContain('Critical');
    expect(html).toMatchSnapshot();
  });
});

describe('Snapshot: Card', () => {
  it('basic card with header', () => {
    const html = renderHTML(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Card body content</p>
        </CardContent>
      </Card>
    );
    expect(html).toContain('Test Card');
    expect(html).toContain('Card body content');
    expect(html).toMatchSnapshot();
  });
});

describe('Snapshot: Button', () => {
  it('primary button', () => {
    const html = renderHTML(<Button>Save</Button>);
    expect(html).toContain('Save');
    expect(html).toMatchSnapshot();
  });

  it('danger button', () => {
    const html = renderHTML(<Button variant="danger">Delete</Button>);
    expect(html).toContain('Delete');
    expect(html).toMatchSnapshot();
  });

  it('outline button', () => {
    const html = renderHTML(<Button variant="outline">Cancel</Button>);
    expect(html).toContain('Cancel');
    expect(html).toMatchSnapshot();
  });

  it('disabled button', () => {
    const html = renderHTML(<Button disabled>Disabled</Button>);
    expect(html).toContain('Disabled');
    expect(html).toMatchSnapshot();
  });
});

describe('Snapshot: Spinner', () => {
  it('default spinner', () => {
    const html = renderHTML(<Spinner />);
    expect(html).toContain('animate-spin');
    expect(html).toMatchSnapshot();
  });

  it('large spinner', () => {
    const html = renderHTML(<Spinner size="lg" />);
    expect(html).toMatchSnapshot();
  });
});

describe('Snapshot: SignalBadge', () => {
  it('LOW band', () => {
    const html = renderHTML(<SignalBadge band="LOW" />);
    expect(html).toContain('Low');
    expect(html).toMatchSnapshot();
  });

  it('MODERATE band', () => {
    const html = renderHTML(<SignalBadge band="MODERATE" />);
    expect(html).toContain('Moderate');
    expect(html).toMatchSnapshot();
  });

  it('ELEVATED band', () => {
    const html = renderHTML(<SignalBadge band="ELEVATED" />);
    expect(html).toContain('Elevated');
    expect(html).toMatchSnapshot();
  });

  it('GUARDED band', () => {
    const html = renderHTML(<SignalBadge band="GUARDED" />);
    expect(html).toContain('Guarded');
    expect(html).toMatchSnapshot();
  });
});
