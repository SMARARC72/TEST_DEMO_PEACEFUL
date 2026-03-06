import { WebSocket } from "ws";

type NotificationRole =
  | "PATIENT"
  | "CLINICIAN"
  | "SUPERVISOR"
  | "ADMIN"
  | "COMPLIANCE_OFFICER";

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
  tenantId: string;
  role: NotificationRole;
}

const clients = new Map<WebSocket, ConnectedClient>();

export function registerWsClient(client: ConnectedClient) {
  clients.set(client.socket, client);
}

export function unregisterWsClient(socket: WebSocket) {
  clients.delete(socket);
}

export function resetRealtimeClientsForTest() {
  clients.clear();
}

export function broadcastToTenantRoles(options: {
  tenantId: string;
  roles: readonly NotificationRole[];
  payload: Record<string, unknown>;
}) {
  let delivered = 0;

  for (const client of clients.values()) {
    if (client.tenantId !== options.tenantId) continue;
    if (!options.roles.includes(client.role)) continue;

    if (client.socket.readyState !== WebSocket.OPEN) {
      clients.delete(client.socket);
      continue;
    }

    client.socket.send(JSON.stringify(options.payload));
    delivered += 1;
  }

  return delivered;
}

const CLINICIAN_ROLES = ["CLINICIAN", "SUPERVISOR", "ADMIN"] as const;

export function broadcastClinicianEvent(
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return broadcastToTenantRoles({
    tenantId,
    roles: CLINICIAN_ROLES,
    payload,
  });
}