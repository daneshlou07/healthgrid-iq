/**
 * API Client for Firebase Cloud Functions
 * Provides typed interfaces for all backend endpoints
 */

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
} from '../types';

// Base URL for API calls (defaults to localhost for development)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/healthgrid-iq-demo/us-central1/api';

// API Key for authenticated requests (if required)
const API_KEY = import.meta.env.VITE_API_KEY || '';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      this.headers['X-API-Key'] = API_KEY;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // ==================== USERS ====================
  async getUsers(role?: string): Promise<{ users: User[]; count: number }> {
    const params = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.request(`/api/users${params}`);
  }

  async getUser(userId: string): Promise<User> {
    return this.request(`/api/users/${userId}`);
  }

  // ==================== CLINICS ====================
  async getClinics(status?: string): Promise<{ clinics: Clinic[]; count: number }> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/clinics${params}`);
  }

  async getClinic(clinicId: string): Promise<Clinic> {
    return this.request(`/api/clinics/${clinicId}`);
  }

  // ==================== PATIENTS ====================
  async getPatients(clinicId?: string): Promise<{ patients: Patient[]; count: number }> {
    const params = clinicId ? `?clinicId=${encodeURIComponent(clinicId)}` : '';
    return this.request(`/api/patients${params}`);
  }

  async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    return this.request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  // ==================== CASES ====================
  async getCases(filters?: {
    status?: string;
    registeredById?: string;
    radiographerId?: string;
    severity?: string;
    limit?: number;
  }): Promise<{ cases: Case[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.registeredById) params.append('registeredById', filters.registeredById);
    if (filters?.radiographerId) params.append('radiographerId', filters.radiographerId);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    return this.request(`/api/cases${queryString ? `?${queryString}` : ''}`);
  }

  async getCase(caseId: string): Promise<Case> {
    return this.request(`/api/cases/${caseId}`);
  }

  async createCase(caseData: Omit<Case, 'id'>): Promise<Case> {
    return this.request('/api/cases', {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    return this.request(`/api/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ==================== REPORTS ====================
  async getReports(filters?: {
    caseId?: string;
    radiologistId?: string;
    status?: string;
  }): Promise<{ reports: Report[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.append('caseId', filters.caseId);
    if (filters?.radiologistId) params.append('radiologistId', filters.radiologistId);
    if (filters?.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    return this.request(`/api/reports${queryString ? `?${queryString}` : ''}`);
  }

  async createReport(report: Omit<Report, 'id'>): Promise<Report> {
    return this.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // ==================== FLEET (MOBILE PACS VANS) ====================
  async getFleet(): Promise<{ vans: MobilePacsVan[]; count: number }> {
    return this.request('/api/fleet');
  }

  async updateVan(vanId: string, updates: Partial<MobilePacsVan>): Promise<MobilePacsVan> {
    return this.request(`/api/fleet/${vanId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ==================== SCHEDULES (IAS INTEGRATION) ====================
  async getSchedules(filters?: {
    userId?: string;
    clinicId?: string;
    date?: string;
  }): Promise<{ schedules: RadioScheduleProfile[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.clinicId) params.append('clinicId', filters.clinicId);
    if (filters?.date) params.append('date', filters.date);
    
    const queryString = params.toString();
    return this.request(`/api/schedules${queryString ? `?${queryString}` : ''}`);
  }

  async createSchedule(schedule: Omit<RadioScheduleProfile, 'id'>): Promise<RadioScheduleProfile> {
    return this.request('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async updateSchedule(scheduleId: string, updates: Partial<RadioScheduleProfile>): Promise<RadioScheduleProfile> {
    return this.request(`/api/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ==================== AUDIT LOGS ====================
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    return this.request(`/api/audit-logs${queryString ? `?${queryString}` : ''}`);
  }

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return this.request('/api/audit-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // ==================== ANALYTICS ====================
  async getDashboardAnalytics(): Promise<{
    totalCases: number;
    totalPatients: number;
    totalUsers: number;
    totalReports: number;
    casesByStatus: Record<string, number>;
    casesBySeverity: Record<string, number>;
    reportsByStatus: Record<string, number>;
  }> {
    return this.request('/api/analytics/dashboard');
  }

  // ==================== IAS WEBHOOK (for external systems) ====================
  async sendIasWebhook(data: {
    event: 'SCHEDULE_ASSIGNED' | 'SCHEDULE_UPDATED' | 'SCHEDULE_CANCELLED';
    caseId: string;
    radiographerId: string;
    radiographerName: string;
    scheduledAt: string;
    clinicId?: string;
    vanId?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/api/ias/webhook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing/custom instances
export default ApiClient;
