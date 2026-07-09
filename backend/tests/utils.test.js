// @vitest-environment node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function loadUtils() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  const context = vm.createContext({
    window: dom.window,
    document: dom.window.document,
    console,
    setTimeout: dom.window.setTimeout.bind(dom.window),
    clearTimeout: dom.window.clearTimeout.bind(dom.window)
  });
  const code = fs.readFileSync(path.join(__dirname, '..', '..', 'front', 'assets', 'js', 'utils.js'), 'utf8');
  vm.runInContext(code, context);
  return context.window.Utils;
}

describe('front Utils', () => {
  let Utils;

  beforeEach(() => {
    Utils = loadUtils();
  });

  it('escapes HTML-sensitive characters', () => {
    expect(Utils.escapeHtml('<script>"x" & \'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  });

  it('truncates long text with a suffix', () => {
    expect(Utils.truncate('abcdef', 5)).toBe('ab...');
    expect(Utils.truncate('abc', 5)).toBe('abc');
  });

  it('normalizes relative avatar paths against the backend base URL', () => {
    expect(Utils.getAvatar('/avatar/default.png', 'Alice')).toBe('http://localhost:5000/avatar/default.png');
  });
});