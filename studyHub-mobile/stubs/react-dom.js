// Stub for react-dom — not available in React Native.
// @react-aria internals reference react-dom but only use it for web-specific
// features (e.g. flushSync). Providing no-ops prevents the bundler error.
module.exports = {
  flushSync: (fn) => fn(),
  createPortal: (children) => children,
}
