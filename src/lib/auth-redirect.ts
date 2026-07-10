const defaultAppUrl = "https://kidsmemo.vercel.app";

export function getAuthCallbackUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || defaultAppUrl;
  const appUrl = configuredAppUrl.endsWith("/") ? configuredAppUrl : `${configuredAppUrl}/`;

  return new URL("auth/callback", appUrl).toString();
}
