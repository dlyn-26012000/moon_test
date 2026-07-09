// Test data & fixtures for the User Add-to-Cart E2E suite.
// Verified live against https://moon.dlyn.site / https://api-moon.dlyn.site on 2026-07-09.

module.exports = {
  baseURL: process.env.CART_BASE_URL || 'https://moon.dlyn.site',
  apiURL: process.env.CART_API_URL || 'https://api-moon.dlyn.site/api',

  account: {
    username: process.env.CART_USER || 'user001',
    password: process.env.CART_PASS || 'password',
  },

  // A real, in-stock product with variants (size + Color) on the target env.
  product: {
    id: 100,
    slug: 'qui-eos-laborum-variant-tojq17',
    hasVariants: true,
    // variant ids confirmed via /products/{slug}/detail
    variants: {
      v189: { id: 189, stock: 85 },
      v190: { id: 190, stock: 54 },
      v191: { id: 191, stock: 99 },
    },
    attributes: {
      size: ['M', 'XS'],
      color: ['White', 'Black', 'Yellow'],
    },
  },

  // localStorage keys used by the app
  storage: {
    cartSession: 'cart_session_id',
    authToken: 'auth_token',
  },

  i18n: {
    vi: {
      addToCart: 'Thêm vào giỏ hàng',
      cart: 'Giỏ hàng',
      cartEmpty: 'Giỏ hàng của bạn đang trống',
      outOfStock: 'Hết hàng',
      addedSuccess: 'Đã thêm vào giỏ hàng thành công',
    },
    en: {
      addToCart: 'Add to Cart',
      cart: 'Cart',
      cartEmpty: 'Your cart is empty',
      outOfStock: 'Out of stock',
      addedSuccess: 'Added to cart successfully',
    },
  },

  viewports: {
    desktop_1920: { width: 1920, height: 1080 },
    desktop_1440: { width: 1440, height: 900 },
    desktop_1366: { width: 1366, height: 768 },
    ipad: { width: 768, height: 1024 },
    ipad_air: { width: 820, height: 1180 },
    iphone_14: { width: 390, height: 844 },
    iphone_se: { width: 375, height: 667 },
    pixel_7: { width: 412, height: 915 },
    galaxy_s23: { width: 360, height: 780 },
  },
};
