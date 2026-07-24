export type LandingBrand = {
  logo: string;
  loginLabel: string;
  eyebrow: string;
  footer: string;
};

export const LANDING_BRAND_DEFAULTS: LandingBrand = {
  logo: "키즈메모",
  loginLabel: "로그인",
  eyebrow: "우리 원의 사진 운영 노트",
  footer: "점보키즈 연동 기관을 위한 키즈메모"
};

export type LandingCard = {
  slot: string;
  icon: string;
  title: string;
  body: string;
};

export const LANDING_CARD_DEFAULTS: LandingCard[] = [
  {
    slot: "schedule",
    icon: "calendar",
    title: "사진으로 시작하는 행사",
    body: "우리 반의 순간을 먼저 고르고 행사를 정리합니다."
  },
  {
    slot: "teacher-message",
    icon: "document",
    title: "다정한 안내문 완성",
    body: "사진과 행사 내용을 담아 부모님께 전합니다."
  },
  {
    slot: "jumbokids-benefit",
    icon: "photo",
    title: "우리 기관의 기록",
    body: "행사와 혜택, 보낸 안내를 한 권처럼 모아봅니다."
  }
];
