globalThis.window = {
  location: { href: "http://uji.local/", search: "", origin: "http://uji.local", pathname: "/" },
  history: { replaceState() {}, pushState() {} },
  addEventListener() {}, removeEventListener() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
globalThis.document = { title: "uji", cookie: "", addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
  body: { appendChild() {}, style: {} } };
globalThis.localStorage = globalThis.window.localStorage;
globalThis.navigator = { userAgent: "node-uji" };
globalThis.matchMedia = globalThis.window.matchMedia;
require("./out.cjs");
