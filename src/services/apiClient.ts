/**
 * apiClient.ts — Authenticated REST API Client for Firebase Cloud Functions
 *
 * Every request automatically attaches the current user's Firebase ID token
 * as Authorization: Bearer <token>. On a 401 the client forces a token refresh
 * and retries once before throwing.
 *
 * Set VITE_API_BASE_URL in .env to your Cloud Functions URL, e.g.:
 *   VITE_API_BASE_URL=https://us-central1-healthgrid-iq.cloudfunctions.net/api
 */

import { getIdToken } from './firebase';
import type {
  User,
  Clinic,
  Patient,
  Case,
  Report,
  PatientRequest,
  AuditLog,
  MobilePacsVan,
  RadioScheduleProfile,
  Notification,
  Comment,
} from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5001/healthgrid-iq-demo/us-central1/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Core client
// ---------------------------------------------------------------------------
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const attemptRequest = async (forceRefresh: boolean): Promise<Response> => {
      const token = await getIdToken(forceRefresh);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return fetch(this.url(endpoint), { ...options, headers });
    };

    let response: Response;
    try {
      response = await attemptRequest(false);
    } catch (err: any) {
      console.warn(`API request to ${endpoint} failed (backend unreachable):`, err);
      throw new Error(`API Endpoint Unreachable (${endpoint})`);
    }

    // On 401, force a token refresh and retry exactly once
    if (response.status === 401) {
      try {
        response = await attemptRequest(true);
      } catch (err: any) {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      if (response.status === 401) throw new Error('Session expired. Please log in again.');
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // =========================================================================
  // USERS
  // =========================================================================

  async getUsers(role?: string): Promise<{ users: User[]; count: number }> {
    const params = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.request(`/v1/users${params}`);
  }

  async getUser(userId: string): Promise<User> {
    return this.request(`/v1/users/${userId}`);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return this.request(`/v1/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // CLINICS
  // =========================================================================

  async getClinics(status?: string): Promise<{ clinics: Clinic[]; count: number }> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/v1/clinics${params}`);
  }

  async getClinic(clinicId: string): Promise<Clinic> {
    return this.request(`/v1/clinics/${clinicId}`);
  }

  // =========================================================================
  // PATIENTS
  // =========================================================================

  async getPatients(opts?: {
    clinicId?: string;
    after?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Patient>> {
    const params = new URLSearchParams();
    if (opts?.clinicId) params.set('clinicId', opts.clinicId);
    if (opts?.after) params.set('after', opts.after);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.request(`/v1/patients${qs ? `?${qs}` : ''}`);
  }

  async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    return this.request('/v1/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    return this.request(`/v1/patients/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // CASES
  // =========================================================================

  async getCases(filters?: {
    status?: string;
    registeredById?: string;
    radiographerId?: string;
    severity?: string;
    after?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Case>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.registeredById) params.append('registeredById', filters.registeredById);
    if (filters?.radiographerId) params.append('radiographerId', filters.radiographerId);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.after) params.append('after', filters.after);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const qs = params.toString();
    return this.request(`/v1/cases${qs ? `?${qs}` : ''}`);
  }

  async getCase(caseId: string): Promise<Case> {
    return this.request(`/v1/cases/${caseId}`);
  }

  async createCase(caseData: Omit<Case, 'id'>): Promise<Case> {
    return this.request('/v1/cases', {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    return this.request(`/v1/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // REPORTS
  // =========================================================================

  async getReports(filters?: {
    caseId?: string;
    radiologistId?: string;
    status?: string;
    after?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Report>> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.append('caseId', filters.caseId);
    if (filters?.radiologistId) params.append('radiologistId', filters.radiologistId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.after) params.append('after', filters.after);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const qs = params.toString();
    return this.request(`/v1/reports${qs ? `?${qs}` : ''}`);
  }

  async createReport(report: Omit<Report, 'id'>): Promise<Report> {
    return this.request('/v1/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async updateReport(reportId: string, updates: Partial<Report>): Promise<Report> {
    return this.request(`/v1/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // PATIENT REQUESTS
  // =========================================================================

  async getPatientRequests(): Promise<PaginatedResponse<PatientRequest>> {
    return this.request('/v1/patient-requests');
  }

  async createPatientRequest(req: Omit<PatientRequest, 'id'>): Promise<PatientRequest> {
    return this.request('/v1/patient-requests', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updatePatientRequest(
    requestId: string,
    updates: Partial<PatientRequest>
  ): Promise<PatientRequest> {
    return this.request(`/v1/patient-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // FLEET (MOBILE PACS VANS)
  // =========================================================================

  async getFleet(): Promise<{ vans: MobilePacsVan[]; count: number }> {
    return this.request('/v1/fleet');
  }

  async updateVan(vanId: string, updates: Partial<MobilePacsVan>): Promise<MobilePacsVan> {
    return this.request(`/v1/fleet/${vanId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // SCHEDULES
  // =========================================================================

  async getSchedules(filters?: {
    userId?: string;
    clinicId?: string;
    date?: string;
  }): Promise<{ schedules: RadioScheduleProfile[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.clinicId) params.append('clinicId', filters.clinicId);
    if (filters?.date) params.append('date', filters.date);
    const qs = params.toString();
    return this.request(`/v1/schedules${qs ? `?${qs}` : ''}`);
  }

  async createSchedule(schedule: RadioScheduleProfile): Promise<RadioScheduleProfile> {
    return this.request('/v1/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<RadioScheduleProfile>
  ): Promise<RadioScheduleProfile> {
    return this.request(`/v1/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.after) params.append('after', filters.after);
    const qs = params.toString();
    return this.request(`/v1/audit-logs${qs ? `?${qs}` : ''}`);
  }

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return this.request('/v1/audit-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // =========================================================================
  // COMMENTS
  // =========================================================================

  async getComments(caseId: string): Promise<{ comments: Comment[]; count: number }> {
    return this.request(`/v1/cases/${caseId}/comments`);
  }

  async addComment(
    caseId: string,
    comment: Pick<Comment, 'message'>
  ): Promise<Comment> {
    return this.request(`/v1/cases/${caseId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  async getNotifications(userId: string): Promise<{ notifications: Notification[]; count: number }> {
    return this.request(`/v1/notifications/${encodeURIComponent(userId)}`);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.request(`/v1/notifications/${notificationId}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    return this.request(`/v1/notifications/${encodeURIComponent(userId)}/read-all`, {
      method: 'PATCH',
    });
  }

  // =========================================================================
  // ANALYTICS
  // =========================================================================

  async getDashboardAnalytics(): Promise<{
    totalCases: number;
    totalPatients: number;
    totalUsers: number;
    totalReports: number;
    casesByStatus: Record<string, number>;
    casesBySeverity: Record<string, number>;
    reportsByStatus: Record<string, number>;
  }> {
    return this.request('/v1/analytics/dashboard');
  }

  // =========================================================================
  // IAS WEBHOOK
  // =========================================================================

  async sendIasWebhook(data: {
    event: 'SCHEDULE_ASSIGNED' | 'SCHEDULE_UPDATED' | 'SCHEDULE_CANCELLED';
    caseId: string;
    radiographerId: string;
    radiographerName: string;
    scheduledAt: string;
    clinicId?: string;
    vanId?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/v1/ias/webhook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing / custom instances
export default ApiClient;
