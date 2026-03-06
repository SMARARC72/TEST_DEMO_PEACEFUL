import { describe, expect, it, vi, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import {
  broadcastClinicianEvent,
  registerWsClient,
  resetRealtimeClientsForTest,
} from './realtime.js';

function createSocket(readyState = WebSocket.OPEN) {
  return {
    readyState,
    send: vi.fn(),
  } as unknown as WebSocket;
}

describe('realtime service', () => {
  afterEach(() => {
    resetRealtimeClientsForTest();
  });

  it('broadcasts clinician events only to matching tenant clinician roles', () => {
    const clinicianSocket = createSocket();
    const patientSocket = createSocket();
    const otherTenantSocket = createSocket();

    registerWsClient({
      socket: clinicianSocket,
      userId: 'clinician-1',
      tenantId: 'tenant-1',
      role: 'CLINICIAN',
    });
    registerWsClient({
      socket: patientSocket,
      userId: 'patient-1',
      tenantId: 'tenant-1',
      role: 'PATIENT',
    });
    registerWsClient({
      socket: otherTenantSocket,
      userId: 'clinician-2',
      tenantId: 'tenant-2',
      role: 'CLINICIAN',
    });

    const delivered = broadcastClinicianEvent('tenant-1', {
      type: 'submission:new',
      patientId: 'patient-1',
    });

    expect(delivered).toBe(1);
    expect((clinicianSocket.send as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((patientSocket.send as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((otherTenantSocket.send as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});