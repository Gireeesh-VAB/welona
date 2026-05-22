/**
 * Auth cookie names — kept in a dependency-free module so both client
 * components and server code can import them without pulling in the
 * server-only auth service.
 *
 * The access cookie is readable by JS (middleware + AuthGuard use it);
 * the refresh cookie is httpOnly.
 */
export const ACCESS_COOKIE = 'welona_token';
export const REFRESH_COOKIE = 'welona_refresh';
