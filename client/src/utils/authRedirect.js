/**
 * @file authRedirect.js
 * @description Post-login redirect utility for role-based routing
 * @module Utils/AuthRedirect
 *
 * Maps a logged-in user's role and customerType to the appropriate
 * landing route after login, registration, or password reset.
 */

/** Maps Customer model customerType values to their URL route segments */
const CUSTOMER_TYPE_ROUTES = {
  residential: 'residential',
  singleBusiness: 'single-business',
  headOffice: 'head-office',
  branch: 'branch',
  franchise: 'franchise',
};

/**
 * Determine the post-login landing path for a user.
 *
 * @param {Object} userData - User object returned from auth endpoints
 * @param {string} userData.role - User role
 * @param {string|null} userData.customerProfile - Linked Customer record _id
 * @param {string|null} userData.customerType - customerType from the Customer record
 * @returns {string} React Router path to navigate to
 */
export function getPostLoginRedirect(userData) {
  if (
    userData?.role === 'customer' &&
    userData?.customerProfile &&
    userData?.customerType
  ) {
    const segment = CUSTOMER_TYPE_ROUTES[userData.customerType];
    if (segment) {
      return `/customers/${segment}/${userData.customerProfile}`;
    }
  }
  return '/profile';
}
