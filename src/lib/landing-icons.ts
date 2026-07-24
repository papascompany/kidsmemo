import {
  Bell,
  CalendarDays,
  Camera,
  FileText,
  Gift,
  Heart,
  Image as ImageIcon,
  Sparkles,
  Star,
  Users,
  type LucideIcon
} from "lucide-react";

export type LandingIconKey =
  | "calendar"
  | "document"
  | "photo"
  | "camera"
  | "heart"
  | "star"
  | "bell"
  | "gift"
  | "sparkles"
  | "users";

export const landingIconMap: Record<LandingIconKey, LucideIcon> = {
  calendar: CalendarDays,
  document: FileText,
  photo: ImageIcon,
  camera: Camera,
  heart: Heart,
  star: Star,
  bell: Bell,
  gift: Gift,
  sparkles: Sparkles,
  users: Users
};

export const LANDING_ICON_KEYS = Object.keys(landingIconMap) as LandingIconKey[];

export const landingIconLabels: Record<LandingIconKey, string> = {
  calendar: "달력",
  document: "안내문",
  photo: "사진",
  camera: "카메라",
  heart: "하트",
  star: "별",
  bell: "알림",
  gift: "선물",
  sparkles: "반짝임",
  users: "사람들"
};

export function resolveLandingIcon(key: string | undefined | null): LucideIcon {
  if (key && key in landingIconMap) {
    return landingIconMap[key as LandingIconKey];
  }
  return landingIconMap.photo;
}
