/** Page Object Model for the Login modal (user app). */
class LoginPage {
  constructor(page) {
    this.page = page;
    // Header / dropdown
    this.accountBtn = page.locator('button[aria-label="Account menu"]');
    // Modal
    this.modal = page.locator('div[role="dialog"]');
    this.usernameInput = page.locator('#login-username');
    this.passwordInput = page.locator('#login-password');
    this.submitBtn = this.modal.getByRole('button', { name: /Đăng nhập|Login/ }).last();
    this.errorBox = this.modal.locator('.bg-red-50, [class*="text-red"]').first();
    this.togglePwBtn = this.modal.getByRole('button', { name: /password|mật khẩu/i });
  }

  async goto(baseUrl) {
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Site keeps a websocket (Pusher) open, so networkidle never fires — wait for
    // the account menu button to be interactive instead.
    await this.accountBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(800); // let hydration settle
  }

  /** Switch language via the header LanguageSwitcher (globe). */
  async switchLanguage(lang) {
    // The switcher exposes options; click globe then the language.
    const globe = this.page.locator('button[aria-label*="anguage"], button:has(svg.lucide-globe)').first();
    if (await globe.count()) {
      await globe.click().catch(() => {});
      const opt = this.page.getByRole('button', { name: lang === 'en' ? /English/i : /Tiếng Việt|Vietnamese/i }).first();
      if (await opt.count()) await opt.click().catch(() => {});
      await this.page.waitForTimeout(400);
    }
  }

  async openModal(loginMenuText) {
    await this.accountBtn.click();
    await this.page.getByRole('button', { name: loginMenuText, exact: true }).click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async fill(username, password) {
    if (username !== undefined) await this.usernameInput.fill(username);
    if (password !== undefined) await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitBtn.click();
  }

  async isSubmitDisabled() {
    return this.submitBtn.isDisabled();
  }

  async login(username, password) {
    await this.fill(username, password);
    await this.submit();
  }

  async errorText() {
    try {
      await this.errorBox.waitFor({ state: 'visible', timeout: 5000 });
      return (await this.errorBox.innerText()).trim();
    } catch {
      return null;
    }
  }

  async isModalOpen() {
    return this.modal.isVisible().catch(() => false);
  }
}
module.exports = { LoginPage };
