// HealthGrid IQ — Equipment Marketplace Domain Types (Phase 1)

export type EquipmentCategory = 'MEDICAL' | 'NON_MEDICAL';

export type ProcurementMode = 'PURCHASE' | 'RENTAL';
export type ProcurementIntent = ProcurementMode; // Legacy alias for backward compatibility

export type EquipmentAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'REQUEST_SOURCING';

export interface EquipmentItem {
  id: string;
  name: string;
  modelNumber: string;
  category: EquipmentCategory;
  subcategory: string;
  manufacturer: string;
  originCountry: string;
  description: string;
  keySpecifications: string[];
  complianceStandards?: string[];
  procurementOptions: ProcurementMode[];
  minRentalPeriodMonths?: number;
  leadTimeWeeks: number;
  warrantyYears: number;
  powerRequirements?: string;
  dimensions?: string;
  weightKg?: number;
  availability: EquipmentAvailability;
  imageUrl?: string;
}

export interface RfqDraftItem {
  id: string;
  equipmentId: string;
  itemName: string;
  modelNumber: string;
  category: EquipmentCategory;
  subcategory: string;
  manufacturer: string;
  quantity: number;
  procurementMode: ProcurementMode;
  rentalDurationMonths?: number;
  isCustom?: boolean;
  customSpecifications?: string;
  // Backward compatibility alias
  procurementIntent?: ProcurementMode;
}

// Backward-compatible alias for existing references
export type MarketplaceCartItem = RfqDraftItem;

export type QuotationStatus = 
  | 'SUBMITTED'
  | 'QUOTATION_ISSUED'
  | 'NEGOTIATION_IN_PROGRESS'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type OrderStatus =
  | 'ORDER_CONFIRMED'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface QuotationItem {
  id: string;
  equipmentId?: string;
  itemName: string;
  modelNumber?: string;
  category: EquipmentCategory;
  subcategory?: string;
  manufacturer?: string;
  isCustom: boolean;
  customSpecifications?: string;
  quantity: number;
  procurementIntent: ProcurementMode;
  rentalDurationMonths?: number;
  unitPrice?: number;
  monthlyRentalRate?: number;
  discountPercent?: number;
  subtotal?: number;
  adminNotes?: string;
}

export interface QuotationNegotiationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  message: string;
  requestedDiscountPercent?: number;
  adminRevisedDiscountPercent?: number;
}

export interface QuotationRequest {
  id: string;
  quotationNumber?: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  userPhone: string;
  facilityName: string;
  deliveryAddress: string;
  requiredByDate: string;
  urgency: 'STANDARD' | 'URGENT' | 'CRITICAL';
  notes?: string;
  items: QuotationItem[];
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  validUntil?: string;
  subtotalAmount?: number;
  discountAmount?: number;
  sstTaxAmount?: number;
  totalAmount?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  deliveryLeadTimeWeeks?: number;
  adminRemarks?: string;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  negotiationHistory: QuotationNegotiationMessage[];
  userDecisionRemarks?: string;
  decidedAt?: string;
}
