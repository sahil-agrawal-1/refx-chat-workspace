/**
 * Minimal test shims so src/stores/app-store.tsx (a React component module)
 * can be exercised under plain Node with node:test/tsx, without a browser DOM.
 *
 * These run before app-store is imported, so localStorage/window/document exist
 * when the browser-preview bridge singleton and AppProvider initialize.
 */

const localStorageStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => (key in localStorageStore ? localStorageStore[key] : null),
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  },
} as unknown as Storage;

const doc: any = { nodeType: 9, childNodes: [] as unknown[] };

const makeNode = () => ({
  nodeType: 1,
  tagName: 'DIV',
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  ownerDocument: doc,
  childNodes: [] as unknown[],
  appendChild: function (this: any, n: any) {
    this.childNodes.push(n);
    return n;
  },
  removeChild: function (this: any, n: any) {
    const i = this.childNodes.indexOf(n);
    if (i >= 0) this.childNodes.splice(i, 1);
    return n;
  },
  setAttribute: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  style: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  querySelector: () => null,
  querySelectorAll: () => [],
  getAttribute: () => null,
  activeElement: null,
}) as unknown as HTMLElement;

doc.documentElement = makeNode();
doc.createElement = () => makeNode();
doc.addEventListener = () => {};
doc.removeEventListener = () => {};
doc.activeElement = null;

(globalThis as any).document = doc as unknown as Document;
(globalThis as any).window = globalThis;
(window as any).defaultView = window;

// Fake DOM constructors so React's `instanceof Element/HTMLElement/HTMLIFrameElement`
// checks in the commit phase do not throw in plain Node.
(globalThis as any).Element = class Element {};
(globalThis as any).Node = class Node {};
(globalThis as any).HTMLElement = class HTMLElement extends Element {};
(globalThis as any).HTMLIFrameElement = class HTMLIFrameElement extends HTMLElement {};

// Opt into React 19's act() support so state updates flushed by act() are processed.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

export { localStorageStore };
