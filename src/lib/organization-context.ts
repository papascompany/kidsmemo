import { events, organizations, profiles, staffCoupons } from "./mock-data";
import type { AdminContentBlock, AdminMediaAsset } from "./admin-operations";
import type { EventSchedule, Organization, Profile, StaffCoupon } from "./types";

export interface OrganizationContent {
  blocks: AdminContentBlock[];
  media: AdminMediaAsset[];
}

export interface OrganizationContext {
  organization: Organization;
  director: Profile | undefined;
  members: Profile[];
  events: EventSchedule[];
  coupons: StaffCoupon[];
  content: OrganizationContent;
}

export function getPrimaryOrganization() {
  return organizations[0] ?? null;
}

export function getPrimaryOrganizationId() {
  return getPrimaryOrganization()?.id ?? "";
}

export function getOrganizationContext(organizationId = getPrimaryOrganizationId()): OrganizationContext {
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];

  if (!organization) {
    return {
      organization: {
        id: "",
        name: "",
        type: "daycare",
        region: "",
        memberCount: 0
      },
      director: undefined,
      members: [],
      events: [],
      coupons: [],
      content: { blocks: [], media: [] }
    };
  }

  const members = profiles.filter((profile) => profile.organizationId === organization.id);
  const director = members.find((profile) => profile.role === "owner");
  const organizationEvents = events.filter((event) => event.organizationId === organization.id);
  const organizationCoupons = staffCoupons.filter((coupon) => coupon.organizationId === organization.id);

  return {
    organization,
    director,
    members,
    events: organizationEvents,
    coupons: organizationCoupons,
    content: { blocks: [], media: [] }
  };
}
