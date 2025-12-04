export type Severity = 'low' | 'medium' | 'high' | 'emergency';
export type IssueStatus = 'ongoing' | 'resolved' | 'partial';
export type CommunicationMethod = 'text' | 'email' | 'phone' | 'portal' | 'in-person' | 'letter' | 'other';
export type PromiseStatus = 'kept' | 'not_kept' | 'partial' | 'unknown';

export interface LandlordContact {
  name: string;
  phone: string;
  email: string;
  other: string;
}

export interface Lease {
  start_date: string;
  end_date: string;
}

export interface CaseMetadata {
  id: string;
  property_address: string;
  landlord_contact: LandlordContact;
  lease: Lease;
}

export interface EvidenceItem {
  id: string;
  issue_id: string;
  file_reference: string; // This will store base64 data URL for this demo
  captured_at: string;
  uploaded_at: string;
  ai_caption: string;
  user_caption: string;
}

export interface Issue {
  id: string;
  title: string;
  category: string;
  room: string;
  severity: Severity;
  status: IssueStatus;
  first_noticed_at: string;
  description: string;
  habitability_categories: string[];
}

export interface LandlordPromise {
  id: string;
  description: string;
  promised_completion_date: string;
  promised_by: string;
  status: PromiseStatus;
}

export interface Communication {
  id: string;
  date: string;
  method: CommunicationMethod;
  tenant_message: string;
  landlord_response: string;
  linked_issue_ids: string[];
  promises: LandlordPromise[];
}

export interface TenantCase {
  meta: CaseMetadata;
  issues: Issue[];
  evidence: EvidenceItem[];
  communications: Communication[];
}

export interface AIAnalysisResponse {
  case?: Partial<CaseMetadata>;
  issue?: Partial<Issue>;
  evidence_items?: Partial<EvidenceItem>[];
  communications?: Partial<Communication>[];
  timeline_summary?: string;
  pattern_summary?: string;
  report_snippet?: string;
  disclaimer: string;
}
