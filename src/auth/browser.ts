/**
 * Optional Playwright-based browser authentication for App Store Connect.
 * Used to access the internal iris API for full feedback text/comments.
 * 
 * This module is lazily loaded — Playwright is only required if
 * ENABLE_BROWSER_AUTH=true is set.
 */

export interface BrowserSession {
  cookies: string;
  csrfToken?: string;
}

let session: BrowserSession | null = null;

export function isEnabled(): boolean {
  return process.env.ENABLE_BROWSER_AUTH === "true";
}

export async function getSession(): Promise<BrowserSession | null> {
  if (!isEnabled()) return null;
  if (session) return session;

  try {
    session = await authenticate();
    return session;
  } catch (error) {
    console.error("Browser auth failed:", error);
    return null;
  }
}

async function authenticate(): Promise<BrowserSession> {
  // Dynamic import so playwright is only needed when browser auth is enabled
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  // @ts-expect-error -- playwright is an optional peer dependency
  const { chromium } = await import("playwright");

  const username = process.env.ASC_USERNAME;
  const password = process.env.ASC_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "ENABLE_BROWSER_AUTH=true but ASC_USERNAME/ASC_PASSWORD not set."
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to App Store Connect
    await page.goto("https://appstoreconnect.apple.com/login");

    // Apple ID login flow — enters iframe
    const idmsaFrame = page.frameLocator("#aid-auth-widget-iFrame");
    await idmsaFrame.locator("#account_name_text_field").fill(username);
    await idmsaFrame.locator("#sign-in").click();
    await page.waitForTimeout(2000);

    await idmsaFrame.locator("#password_text_field").fill(password);
    await idmsaFrame.locator("#sign-in").click();

    // Wait for 2FA or redirect — user may need to approve on device
    // We wait up to 120 seconds for the dashboard to load
    await page.waitForURL("**/appstoreconnect.apple.com/**", {
      timeout: 120_000,
    });

    // If 2FA code input appears, log guidance
    const needsMfa = await page
      .locator('input[placeholder="Code"]')
      .isVisible()
      .catch(() => false);
    if (needsMfa) {
      console.error(
        "2FA required. Approve on your Apple device or enter code in the browser."
      );
      // Wait longer for manual 2FA approval
      await page.waitForURL("**/appstoreconnect.apple.com/apps**", {
        timeout: 180_000,
      });
    }

    // Extract cookies
    const cookies = await context.cookies();
    const cookieString = cookies
      .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
      .join("; ");

    return { cookies: cookieString };
  } finally {
    await browser.close();
  }
}

export async function fetchWithBrowserAuth(
  url: string
): Promise<Response | null> {
  const sess = await getSession();
  if (!sess) return null;

  const response = await fetch(url, {
    headers: {
      Cookie: sess.cookies,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(sess.csrfToken ? { "X-Csrf-Itc": sess.csrfToken } : {}),
    },
  });

  if (!response.ok) {
    console.error(`Browser auth request failed: ${response.status}`);
    // Clear session so next attempt re-authenticates
    session = null;
    return null;
  }

  return response;
}

export function clearSession(): void {
  session = null;
}
