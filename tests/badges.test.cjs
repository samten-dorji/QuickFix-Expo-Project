const { test } = require('node:test');
const assert = require('node:assert/strict');
const { statusBadge, priorityBadge, normalizeStatus, NeutralBadgeColors } = require('../src/constants/badges.ts');

test('all canonical statuses resolve to the original Stitch palette', () => {
  for (const [status, background, text, border] of [
    ['Pending', '#fff7ed', '#c2410c', '#fdba74'],
    ['In Progress', '#eff6ff', '#1e40af', '#93c5fd'],
    ['Approved', '#eef2ff', '#3730a3', '#a5b4fc'],
    ['Finished', '#f0fdf4', '#15803d', '#86efac'],
    ['Rejected', '#fef2f2', '#b91c1c', '#fca5a5'],
  ]) {
    assert.deepEqual(statusBadge(status), { label: status, colors: { background, text, border } });
  }
});

test('recognized formatting variants retain the canonical status label', () => {
  for (const value of ['in progress', ' IN PROGRESS ', 'In   Progress', 'inProgress', 'in_progress', 'in-progress']) {
    assert.deepEqual(statusBadge(value), statusBadge('In Progress'));
  }
  assert.equal(statusBadge(' pending ').label, 'Pending');
  assert.equal(statusBadge('RESOLVED').label, 'Finished');
});

test('missing, malformed, priority and prototype-like status values stay neutral', () => {
  for (const value of [undefined, null, '', ' ', 'Unknown', 'High', 'Medium', 'Low', 'constructor', '__proto__', 1, false, {}, [], Symbol('status')]) {
    assert.equal(normalizeStatus(value), null);
    assert.deepEqual(statusBadge(value), { label: 'Unknown status', colors: NeutralBadgeColors });
  }
});

test('priorities keep their own palette and never accept request statuses', () => {
  assert.deepEqual(priorityBadge('Low'), { label: 'Low', colors: { background: '#f9fafb', text: '#6b7280', border: '#d1d5db' } });
  assert.deepEqual(priorityBadge(' medium '), { label: 'Medium', colors: { background: '#fef3c7', text: '#b45309', border: '#fcd34d' } });
  assert.deepEqual(priorityBadge('HIGH'), { label: 'High', colors: { background: '#fef2f2', text: '#dc2626', border: '#fca5a5' } });
  for (const value of [undefined, null, '', 'Pending', 'In Progress', 'Resolved', 'urgent', {}, 7]) {
    assert.deepEqual(priorityBadge(value), { label: 'Unknown priority', colors: NeutralBadgeColors });
  }
});

test('actual badge components render canonical and malformed values without unsafe lookups', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const Module = require('node:module');
  const ts = require('typescript');
  const badges = require('../src/constants/badges.ts');
  // Stub only native host primitives; execute the real theme and TSX components.
  const native = {
    View: 'View', Text: 'Text', StyleSheet: { create: styles => styles },
    Platform: { select: options => options.default },
  };
  let theme;
  function load(relativePath) {
    const filename = path.resolve(__dirname, relativePath);
    const compiled = new Module(filename, module);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    compiled.require = name => {
      if (name === 'react-native') return native;
      if (name === '@/global.css') return {};
      if (name === '@/constants/badges' || name === './badges') return badges;
      if (name === '@/constants/theme') return theme;
      return Module.prototype.require.call(compiled, name);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return compiled.exports;
  }
  theme = load('../src/constants/theme.ts');
  const { StatusBadge } = load('../src/components/ui/StatusBadge.tsx');
  const { PriorityBadge } = load('../src/components/ui/PriorityBadge.tsx');
  for (const value of ['Pending', 'In Progress', 'Resolved', 'in_progress', 'High', undefined, null, {}, 7]) {
    const element = StatusBadge({ status: value });
    const expected = statusBadge(value);
    assert.equal(element.props.children.props.children, expected.label);
    assert.equal(element.props.style.at(-1).backgroundColor, expected.colors.background);
    assert.equal(element.props.style.at(-1).borderColor, expected.colors.border);
    assert.equal(element.props.children.props.style.at(-1).color, expected.colors.text);
  }
  for (const value of ['Low', 'Medium', 'High', 'Pending', undefined, null, {}]) {
    const element = PriorityBadge({ priority: value });
    assert.equal(element.props.children.props.children, priorityBadge(value).label);
    assert.equal(element.props.style.at(-1).backgroundColor, priorityBadge(value).colors.background);
  }
  assert.equal(StatusBadge({}).props.children.props.children, 'Unknown status');
  assert.equal(PriorityBadge({}).props.children.props.children, 'Unknown priority');
});
