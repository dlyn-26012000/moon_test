/** Shared test data & i18n expectations for the Login suite. */
module.exports = {
  BASE_URL: process.env.LOGIN_BASE_URL || 'https://moon.dlyn.site',
  API_LOGIN: 'https://api-moon.dlyn.site/api/user/auth/login',

  valid: { username: 'user001', password: 'password' },
  wrong: { username: 'user001', password: 'definitely-wrong-pass' },
  unknown: { username: 'no_such_user_zzz', password: 'password' },

  viewports: {
    desktop: { width: 1366, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 390, height: 844 },
  },

  // Text expected per language (must match user/locales/{vi,en}/{auth,common}.json)
  i18n: {
    vi: {
      loginMenu: 'Đăng nhập',
      title: 'Đăng nhập',
      username: 'Tên đăng nhập',
      password: 'Mật khẩu',
      loginButton: 'Đăng nhập',
      forgot: 'Quên mật khẩu?',
      noAccount: 'Chưa có tài khoản?',
      invalidCredentials: 'Tên đăng nhập hoặc mật khẩu không đúng.',
    },
    en: {
      loginMenu: 'Login',
      title: 'Login',
      username: 'Username',
      password: 'Password',
      loginButton: 'Login',
      forgot: 'Forgot password?',
      noAccount: "Don't have an account?",
      invalidCredentials: 'Incorrect username or password.',
    },
  },
};
