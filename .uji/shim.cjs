globalThis.window = {
  location: { href: "http://uji.local/", search: "", origin: "http://uji.local", pathname: "/" },
  history: { replaceState() {}, pushState() {} },
  addEventListener() {}, removeEventListener() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
const elemenPalsu = () => ({ style: {}, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {} }, firstChild: null, insertBefore() {} });
globalThis.document = { title: "uji", cookie: "", addEventListener() {}, removeEventListener() {},
  head: elemenPalsu(), getElementsByTagName: () => [elemenPalsu()], querySelector: () => null, createTextNode: () => ({}),
  createElement: () => elemenPalsu(),
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
  body: { appendChild() {}, style: {} } };
globalThis.localStorage = globalThis.window.localStorage;
globalThis.navigator = { userAgent: "node-uji" };
globalThis.matchMedia = globalThis.window.matchMedia;
require("./out.cjs");
