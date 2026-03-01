// ─── UI Component Tests ──────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';

// ─── Button ──────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-12');
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const handler = vi.fn();
    render(<Button onClick={handler} disabled>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── Badge ───────────────────────────────────

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK').className).toContain('bg-green-100');
  });

  it('defaults to default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-neutral-100');
  });
});

// ─── Card ────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies glass effect', () => {
    const { container } = render(<Card glass>Glass</Card>);
    // The Card div itself has the backdrop-blur class
    const cardDiv = container.firstElementChild as HTMLElement;
    expect(cardDiv.className).toContain('backdrop-blur');
  });

  it('renders with CardHeader, CardTitle, CardContent', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

// ─── Input ───────────────────────────────────

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('sets aria-invalid when error', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles value changes', () => {
    const handler = vi.fn();
    render(<Input label="Search" onChange={handler} />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'test' } });
    expect(handler).toHaveBeenCalled();
  });
});

// ─── Textarea ────────────────────────────────

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<Textarea label="Notes" error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});

// ─── Spinner ─────────────────────────────────

describe('Spinner', () => {
  it('renders with status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies size class', () => {
    render(<Spinner size="lg" />);
    const el = screen.getByRole('status');
    expect(el.classList.contains('h-12')).toBe(true);
  });
});

// ─── Modal ───────────────────────────────────

describe('Modal', () => {
  // jsdom doesn't implement HTMLDialogElement.showModal(), so we mock it
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal ?? vi.fn();
    HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close ?? vi.fn();
  });

  it('renders title and content when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        Content
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
