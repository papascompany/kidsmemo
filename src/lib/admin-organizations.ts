export type AdminOrganizationType = "daycare" | "kindergarten";

export interface AdminOrganizationOption {
  id: string;
  name: string;
  type: AdminOrganizationType;
  region: string;
}

export interface AdminOrganizationsPayload {
  organizations: AdminOrganizationOption[];
}
