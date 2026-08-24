import {
  User,
  Clinic,
  HealthcareOrganization,
  Patient,
  Case,
  Report,
  PatientRequest,
  AuditLog,
  MobilePacsVan,
  RadioScheduleProfile,
  FacilityEquipment,
  BemsIncident,
  CrossOrganizationReferral,
  RadioScheduleSlot,
} from '../types';

// Pure empty database arrays - no hardcoded mock data
export const mockOrganizations: HealthcareOrganization[] = [];
export const mockClinics: Clinic[] = [];
export const mockUsers: User[] = [];
export const mockPatients: Patient[] = [];
export const mockCases: Case[] = [];
export const mockReports: Report[] = [];
export const mockPatientRequests: PatientRequest[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockMobilePacsVans: MobilePacsVan[] = [];
export const mockRadioSchedules: RadioScheduleProfile[] = [];
export const mockFacilityEquipment: FacilityEquipment[] = [];
export const mockBemsIncidents: BemsIncident[] = [];
export const mockCrossOrgReferrals: CrossOrganizationReferral[] = [];

// Generates dynamic schedule time-slots for radiographer appointment booking
export function generateScheduleSlots(bookedSlots: { date: string; time: string; caseId: string }[] = []): RadioScheduleSlot[] {
  const slots: RadioScheduleSlot[] = [];
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    // Slots from 08:00 to 17:00, each 1 hour
    for (let h = 8; h < 17; h++) {
      const startTime = `${String(h).padStart(2, '0')}:00`;
      const endTime = `${String(h + 1).padStart(2, '0')}:00`;
      const booked = bookedSlots.find((s) => s.date === dateStr && s.time === startTime);
      slots.push({
        date: dateStr,
        startTime,
        endTime,
        booked: !!booked,
        caseId: booked?.caseId,
      });
    }
  }
  return slots;
}
