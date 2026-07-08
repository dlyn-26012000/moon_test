/**
 * E2E test luồng đăng ký user (đầy đủ, gồm cả xác thực email OTP).
 * Chạy toàn bộ suite bằng CẢ TIẾNG VIỆT và TIẾNG ANH (ảnh evidence riêng từng
 * ngôn ngữ, prefix vi- / en-), thêm nhóm mobile (prefix mobile-).
 *
 * Yêu cầu trước khi chạy:
 *   - API chạy tại http://localhost:8000  (cd api && php artisan serve)
 *   - User app chạy tại http://localhost:3123  (cd user && npm run dev -- --port 3123)
 *     Lưu ý: PHẢI truy cập qua "localhost" (không phải 127.0.0.1) — Next.js 16 chặn
 *     cross-origin dev resources nên trang sẽ không hydrate nếu dùng 127.0.0.1.
 *   - Chạy trên máy có DB local (script đọc/sửa OTP trong bảng `otps` qua artisan tinker).
 *
 * Case OTP hết hạn: OTP của case đó được config hết hạn sau 5 giây (rút expires_at
 * xuống now+5s qua tinker), chờ 6 giây rồi submit → phải bị từ chối. Không hạ
 * OTP_EXPIRE_MINUTES của cả server vì sẽ làm case "OTP đúng" không kịp thao tác.
 *
 * Chạy:  node register-flow.test.js   (cần playwright: npm i playwright && npx playwright install chromium)
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:3123';
const API_DIR = path.resolve(__dirname, '../../../api');
const SHOT_DIR = __dirname;
const TS = Date.now().toString().slice(-6);
const NAME = 'Playwright Tester';
const PASSWORD = 'Secret123'; // >= 8 ký tự, có chữ + số
const OTP_TYPE_EMAIL_VERIFICATION = 4; // App\Enums\OtpTypeEnum::EMAIL_VERIFICATION

// Text kỳ vọng theo từng ngôn ngữ (khớp user/locales/{vi,en}/auth.json)
const L = {
  vi: {
    registerBtn: 'Đăng ký',
    labels: ['Họ và tên', 'Tên đăng nhập', 'Email', 'Mật khẩu', 'Xác nhận mật khẩu'],
    nameShort: 'Họ và tên phải có ít nhất 2 ký tự.',
    usernameShort: 'Tên đăng nhập phải có ít nhất 8 ký tự.',
    emailInvalid: 'Email không hợp lệ.',
    passwordWeak: 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.',
    mismatch: 'Mật khẩu xác nhận không khớp.',
    verifyTitle: 'Xác thực email',
    otpInvalid: 'Mã OTP không đúng hoặc đã hết hạn.',
    resendBtn: 'Gửi lại mã OTP',
    usernameTaken: 'Tên đăng nhập đã được sử dụng.',
    emailTaken: 'Email đã được sử dụng.',
  },
  en: {
    registerBtn: 'Register',
    labels: ['Full Name', 'Username', 'Email', 'Password', 'Confirm Password'],
    nameShort: 'Full name must be at least 2 characters.',
    usernameShort: 'Username must be at least 8 characters.',
    emailInvalid: 'Invalid email address.',
    passwordWeak: 'Password must be at least 8 characters, with letters and numbers.',
    mismatch: 'Confirm password does not match.',
    verifyTitle: 'Verify your email',
    otpInvalid: 'OTP code is invalid or expired.',
    resendBtn: 'Resend OTP',
    usernameTaken: 'This username is already taken.',
    emailTaken: 'This email is already registered.',
  },
};

const results = [];

function record(caseName, pass, detail) {
  results.push({ caseName, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${caseName}${detail ? ' — ' + detail : ''}`);
}

function makeShooter(prefix) {
  let step = 0;
  return async (page, label) => {
    step += 1;
    const file = path.join(SHOT_DIR, `${prefix}-${String(step).padStart(2, '0')}-${label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`   📸 ${path.basename(file)}`);
  };
}

function tinker(code) {
  // Bọc bằng single-quote để shell không nuốt biến PHP ($u...).
  const escaped = `'${code.replace(/'/g, `'\\''`)}'`;
  return execSync(`php artisan tinker --execute=${escaped}`, {
    cwd: API_DIR, encoding: 'utf8', timeout: 30000,
  }).trim();
}

function fetchLatestOtp(username) {
  return tinker(
    `$u = \\App\\Models\\User::where('username', '${username}')->first();` +
    `echo \\App\\Models\\Otp::where('model_type', \\App\\Models\\User::class)` +
    `->where('model_id', $u->id)->where('type', ${OTP_TYPE_EMAIL_VERIFICATION})->whereNull('used_at')` +
    `->latest('id')->first()?->code ?? 'NONE';`
  );
}

// Config OTP mới nhất của user hết hạn sau N giây kể từ bây giờ.
function setOtpExpiry(username, seconds) {
  return tinker(
    `$u = \\App\\Models\\User::where('username', '${username}')->first();` +
    `$o = \\App\\Models\\Otp::where('model_type', \\App\\Models\\User::class)` +
    `->where('model_id', $u->id)->where('type', ${OTP_TYPE_EMAIL_VERIFICATION})->whereNull('used_at')` +
    `->latest('id')->first();` +
    `$o->update(['expires_at' => now()->addSeconds(${seconds})]); echo $o->code;`
  );
}

function cleanupTestUsers() {
  tinker(`\\App\\Models\\User::query()->where('username', 'like', 'pwtest_%')->forceDelete(); echo 'ok';`);
}

// Điền cả 5 trường của form; truyền '' để bỏ trống trường tương ứng.
async function fillForm(inputs, { name, username, email, password, confirm }) {
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill(username);
  await inputs.nth(2).fill(email);
  await inputs.nth(3).fill(password);
  await inputs.nth(4).fill(confirm);
}

async function openRegisterModal(page, registerLabel) {
  await page.locator('header button[aria-label="Account menu"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('banner').getByRole('button', { name: registerLabel, exact: true }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(300);
}

/**
 * Chạy trọn bộ suite desktop cho 1 ngôn ngữ. Mỗi ngôn ngữ dùng user riêng.
 */
async function runDesktopSuite(browser, lang) {
  const T = L[lang];
  const P = lang.toUpperCase(); // prefix tên case
  const shot = makeShooter(lang);
  const suffix = lang === 'en' ? 'en' : '';
  const USERNAME = `pwtest_${TS}${suffix}`;
  const EMAIL = `pwtest_${TS}${suffix}@example.com`;
  const VALID = { name: NAME, username: USERNAME, email: EMAIL, password: PASSWORD, confirm: PASSWORD };

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const apiResponses = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/user/auth/register')) apiResponses.push(r.status());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Với suite EN: chuyển ngôn ngữ qua LanguageSwitcher trước (đây cũng là 1 case).
  if (lang === 'en') {
    await page.locator('header button[aria-label="Switch language"]').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /English/ }).click();
    await page.waitForTimeout(500);
    await shot(page, 'switched-to-english');
    record(`[${P}] C0. Chuyển ngôn ngữ sang English qua LanguageSwitcher`, true);
  }

  // ═══ C1: Mở modal đăng ký ═══
  await shot(page, 'homepage');
  await page.locator('header button[aria-label="Account menu"]').first().click();
  await page.waitForTimeout(300);
  await shot(page, 'account-dropdown-open');
  await page.getByRole('banner').getByRole('button', { name: T.registerBtn, exact: true }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(300);
  await shot(page, 'register-modal-open');
  record(`[${P}] C1. Mở modal đăng ký (nút "${T.registerBtn}")`, true);

  const dialog = page.locator('[role="dialog"]');
  const inputs = dialog.locator('form input');
  const submitBtn = dialog.locator('button[type="submit"]');
  const fieldErrors = () => dialog.locator('p.text-red-600').allTextContents();

  // ═══ C2: Label i18n ═══
  const labels = await dialog.locator('form label').allTextContents();
  record(`[${P}] C2. Label form đúng ngôn ngữ`, JSON.stringify(labels) === JSON.stringify(T.labels), JSON.stringify(labels));

  // ═══ C3: Form trống → submit disabled ═══
  await shot(page, 'empty-form');
  record(`[${P}] C3. Form trống → submit disabled`, await submitBtn.isDisabled());

  // ═══ C4: Bỏ trống từng trường → submit disabled ═══
  const fieldNames = ['name', 'username', 'email', 'password', 'confirm'];
  const emptyFieldChecks = [];
  for (const field of fieldNames) {
    await fillForm(inputs, { ...VALID, [field]: '' });
    await page.waitForTimeout(150);
    emptyFieldChecks.push(`${field}: ${(await submitBtn.isDisabled()) ? 'disabled ✓' : 'ENABLED ✗'}`);
  }
  await shot(page, 'one-field-empty');
  record(`[${P}] C4. Bỏ trống từng trường → submit disabled`, emptyFieldChecks.every((c) => c.includes('✓')), emptyFieldChecks.join('; '));

  // Helper: điền 1 trường sai (các trường khác hợp lệ), submit, trả về lỗi field
  async function submitWithInvalid(override, label) {
    await fillForm(inputs, { ...VALID, ...override });
    const before = apiResponses.length;
    await submitBtn.click();
    await page.waitForTimeout(600);
    await shot(page, label);
    return { errs: await fieldErrors(), apiCalled: apiResponses.length > before };
  }

  // ═══ C5-C12: từng rule validate client-side ═══
  let r = await submitWithInvalid({ name: 'A' }, 'name-too-short');
  record(`[${P}] C5. Name 1 ký tự → lỗi field, không gọi API`, r.errs.includes(T.nameShort) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ username: 'abc' }, 'username-too-short');
  record(`[${P}] C6. Username 3 ký tự → lỗi field, không gọi API`, r.errs.includes(T.usernameShort) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ email: 'not-an-email' }, 'email-invalid-format');
  record(`[${P}] C7. Email "not-an-email" → lỗi định dạng, không gọi API`, r.errs.includes(T.emailInvalid) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ email: 'abc@xyz' }, 'email-missing-tld');
  record(`[${P}] C8. Email "abc@xyz" → lỗi định dạng, không gọi API`, r.errs.includes(T.emailInvalid) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ password: 'abc123', confirm: 'abc123' }, 'password-too-short');
  record(`[${P}] C9. Password 6 ký tự → lỗi password, không gọi API`, r.errs.includes(T.passwordWeak) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ password: 'abcdefgh', confirm: 'abcdefgh' }, 'password-no-numbers');
  record(`[${P}] C10. Password không có số → lỗi password, không gọi API`, r.errs.includes(T.passwordWeak) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ password: '12345678', confirm: '12345678' }, 'password-no-letters');
  record(`[${P}] C11. Password không có chữ → lỗi password, không gọi API`, r.errs.includes(T.passwordWeak) && !r.apiCalled, JSON.stringify(r.errs));

  r = await submitWithInvalid({ confirm: PASSWORD + 'x' }, 'password-mismatch');
  record(`[${P}] C12. Xác nhận mật khẩu không khớp → lỗi field, không gọi API`, r.errs.includes(T.mismatch) && !r.apiCalled, JSON.stringify(r.errs));

  // ═══ C13: nhiều trường sai cùng lúc ═══
  await fillForm(inputs, { name: 'A', username: 'abc', email: 'sai', password: 'weak', confirm: 'weak' });
  await submitBtn.click();
  await page.waitForTimeout(600);
  await shot(page, 'multiple-field-errors');
  const multiErrs = await fieldErrors();
  record(`[${P}] C13. 4 trường sai cùng lúc → hiện 4 lỗi đồng thời`, multiErrs.length >= 4, `${multiErrs.length} lỗi`);

  // ═══ C14: đăng ký hợp lệ → auto-login + bước xác thực email ═══
  await fillForm(inputs, VALID);
  await shot(page, 'filled-valid');
  await submitBtn.click();
  await page.waitForTimeout(2500);
  await shot(page, 'verify-email-step');
  const verifyTitleVisible = await dialog.getByText(T.verifyTitle).isVisible().catch(() => false);
  const tokenVal = await page.evaluate(() => localStorage.getItem('auth_token'));
  const tokenOk = !!(tokenVal && tokenVal !== 'undefined' && tokenVal.length > 20);
  record(`[${P}] C14. Đăng ký hợp lệ → HTTP 200, token localStorage, hiện bước "${T.verifyTitle}"`,
    apiResponses[apiResponses.length - 1] === 200 && tokenOk && verifyTitleVisible,
    `HTTP ${apiResponses[apiResponses.length - 1]}, token ${tokenOk ? 'OK' : 'LỖI'}, verify ${verifyTitleVisible ? 'hiện' : 'KHÔNG hiện'}`);

  // ═══ C15: OTP trống / thiếu số → nút xác nhận disabled ═══
  const otpInput = dialog.locator('input[inputmode="numeric"]');
  const verifyBtn = dialog.locator('button[type="submit"]');
  const disabledWhenEmpty = await verifyBtn.isDisabled();
  await otpInput.fill('123');
  await page.waitForTimeout(150);
  const disabledWhenPartial = await verifyBtn.isDisabled();
  await shot(page, 'otp-partial-disabled');
  record(`[${P}] C15. OTP trống/3 số → nút xác nhận disabled`, disabledWhenEmpty && disabledWhenPartial);

  // ═══ C16: ô OTP lọc ký tự không phải số ═══
  await otpInput.fill('');
  await otpInput.pressSequentially('12ab#$34');
  const otpVal = await otpInput.inputValue();
  record(`[${P}] C16. Gõ "12ab#$34" → ô OTP chỉ giữ lại số`, otpVal === '1234', `còn: "${otpVal}"`);

  // ═══ C17: OTP sai ═══
  await otpInput.fill('000000');
  await verifyBtn.click();
  await page.waitForTimeout(1200);
  await shot(page, 'wrong-otp-error');
  record(`[${P}] C17. OTP sai (000000) → báo lỗi`, (await fieldErrors()).includes(T.otpInvalid), JSON.stringify(await fieldErrors()));

  // ═══ C18: OTP hết hạn (config hết hạn sau 5 giây, chờ 6 giây) ═══
  const expiredOtp = setOtpExpiry(USERNAME, 5);
  await page.waitForTimeout(6000);
  await otpInput.fill(expiredOtp);
  await verifyBtn.click();
  await page.waitForTimeout(1200);
  await shot(page, 'expired-otp-error');
  record(`[${P}] C18. OTP hết hạn sau 5 giây → bị từ chối`, (await fieldErrors()).includes(T.otpInvalid), `mã ${expiredOtp} (đã hết hạn) → ${JSON.stringify(await fieldErrors())}`);

  // ═══ C19: gửi lại OTP → sinh mã mới ═══
  await dialog.getByRole('button', { name: T.resendBtn }).click();
  await page.waitForTimeout(1200);
  await shot(page, 'otp-resent');
  const freshOtp = fetchLatestOtp(USERNAME);
  record(`[${P}] C19. Gửi lại OTP → sinh mã mới`, freshOtp !== 'NONE' && freshOtp !== expiredOtp, `${expiredOtp} → ${freshOtp}`);

  // ═══ C20: OTP đúng → verify thành công ═══
  await otpInput.fill(freshOtp);
  await verifyBtn.click();
  await page.waitForTimeout(2000);
  await shot(page, 'email-verified-success');
  const modalClosed = (await page.locator('[role="dialog"]').count()) === 0;
  const verifiedInDb = tinker(
    `echo \\App\\Models\\User::where('username', '${USERNAME}')->first()->email_verified_at ? 'YES' : 'NO';`
  );
  const headerText = await page.locator('header').textContent();
  record(`[${P}] C20. OTP đúng → modal đóng, DB verified, vẫn đăng nhập`,
    modalClosed && verifiedInDb === 'YES' && headerText.includes('Playwright'),
    `modal đóng: ${modalClosed}, DB: ${verifiedInDb}`);
  await shot(page, 'logged-in-after-verify');

  // ═══ C21: username trùng ═══
  await page.evaluate(() => localStorage.removeItem('auth_token'));
  await page.reload({ waitUntil: 'networkidle' });
  await openRegisterModal(page, T.registerBtn);
  const dialog2 = page.locator('[role="dialog"]');
  const inputs2 = dialog2.locator('form input');
  await fillForm(inputs2, { ...VALID, email: `dup_${EMAIL}` });
  await dialog2.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  await shot(page, 'duplicate-username-error');
  const dupUserErrs = await dialog2.locator('p.text-red-600').allTextContents();
  record(`[${P}] C21. Username trùng → HTTP 422 + lỗi field`,
    apiResponses[apiResponses.length - 1] === 422 && dupUserErrs.includes(T.usernameTaken),
    `HTTP ${apiResponses[apiResponses.length - 1]}: ${JSON.stringify(dupUserErrs)}`);

  // ═══ C22: email trùng ═══
  await inputs2.nth(1).fill(`${USERNAME}b`);
  await inputs2.nth(2).fill(EMAIL);
  await dialog2.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  await shot(page, 'duplicate-email-error');
  const dupEmailErrs = await dialog2.locator('p.text-red-600').allTextContents();
  const dupEmailCount = tinker(`echo \\App\\Models\\User::where('email', '${EMAIL}')->count();`);
  record(`[${P}] C22. Email trùng → HTTP 422 + lỗi field, DB chỉ có 1 tài khoản`,
    apiResponses[apiResponses.length - 1] === 422 && dupEmailErrs.includes(T.emailTaken) && dupEmailCount === '1',
    `HTTP ${apiResponses[apiResponses.length - 1]}, user cùng email: ${dupEmailCount}`);

  await ctx.close();
}

async function runMobileSuite(browser) {
  const T = L.vi;
  const shot = makeShooter('mobile');
  const MOBILE_USERNAME = `pwtest_${TS}m`;
  const MOBILE_EMAIL = `pwtest_${TS}m@example.com`;

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const mpage = await ctx.newPage();

  // ═══ M1: mở modal, modal vừa màn hình ═══
  await mpage.goto(BASE, { waitUntil: 'networkidle' });
  await shot(mpage, 'homepage');
  await openRegisterModal(mpage, T.registerBtn);
  await shot(mpage, 'register-modal');
  const mdialog = mpage.locator('[role="dialog"]');
  const modalBox = await mdialog.locator('.max-w-md').boundingBox();
  const noHorizontalScroll = await mpage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  record('[MOBILE] M1. Mở modal, modal gọn trong viewport, không tràn ngang',
    !!modalBox && modalBox.width <= 390 && noHorizontalScroll,
    `modal ${modalBox?.width}px / 390px, tràn ngang: ${!noHorizontalScroll}`);

  // ═══ M2: lỗi client-side trên mobile ═══
  const minputs = mdialog.locator('form input');
  await fillForm(minputs, { name: 'A', username: 'abc', email: 'sai', password: 'weak', confirm: 'weak' });
  await mdialog.locator('button[type="submit"]').click();
  await mpage.waitForTimeout(600);
  await shot(mpage, 'client-errors');
  record('[MOBILE] M2. 4 lỗi client-side hiện đúng theo field', (await mdialog.locator('p.text-red-600').allTextContents()).length >= 4);

  // ═══ M3: trọn luồng đăng ký + verify OTP ═══
  await fillForm(minputs, { name: NAME, username: MOBILE_USERNAME, email: MOBILE_EMAIL, password: PASSWORD, confirm: PASSWORD });
  await mdialog.locator('button[type="submit"]').click();
  await mpage.waitForTimeout(2500);
  await shot(mpage, 'verify-email-step');
  const mVerifyVisible = await mdialog.getByText(T.verifyTitle).isVisible().catch(() => false);
  const motp = fetchLatestOtp(MOBILE_USERNAME);
  await mdialog.locator('input[inputmode="numeric"]').fill(motp);
  await mdialog.locator('button[type="submit"]').click();
  await mpage.waitForTimeout(2000);
  await shot(mpage, 'verified-success');
  const mModalClosed = (await mpage.locator('[role="dialog"]').count()) === 0;
  const mVerifiedDb = tinker(
    `echo \\App\\Models\\User::where('username', '${MOBILE_USERNAME}')->first()->email_verified_at ? 'YES' : 'NO';`
  );
  record('[MOBILE] M3. Đăng ký + xác thực OTP trọn vẹn',
    mVerifyVisible && motp !== 'NONE' && mModalClosed && mVerifiedDb === 'YES',
    `verify hiện: ${mVerifyVisible}, modal đóng: ${mModalClosed}, DB: ${mVerifiedDb}`);

  await ctx.close();
}

(async () => {
  cleanupTestUsers();
  const browser = await chromium.launch();

  console.log('\n━━━ SUITE TIẾNG VIỆT ━━━');
  await runDesktopSuite(browser, 'vi');

  // Nghỉ giữa 2 suite để tránh chạm throttle 5 req/phút của endpoint register.
  await new Promise((res) => setTimeout(res, 20000));

  console.log('\n━━━ SUITE TIẾNG ANH ━━━');
  await runDesktopSuite(browser, 'en');

  console.log('\n━━━ SUITE MOBILE ━━━');
  await runMobileSuite(browser);

  const passed = results.filter((x) => x.pass).length;
  console.log(`\n===== KẾT QUẢ: ${passed}/${results.length} PASS =====`);
  results.forEach((x) => console.log(`${x.pass ? '✅' : '❌'} ${x.caseName}${x.detail ? ' — ' + x.detail : ''}`));

  await browser.close();
  cleanupTestUsers();
  console.log('🧹 đã dọn test users');
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('TEST FAILED:', e.message); cleanupTestUsers(); process.exit(1); });
