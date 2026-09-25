// Pure-function unit tests for the branded notification email template.
// No database, no network -- see tests/notifications/postgres.test.ts for
// the integration test proving this function is actually wired into the
// real delivery-preparation path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationEmailHtml, escapeHtml } from '../src/modules/notificationDispatcher/emailTemplate.js';

test('escapeHtml neutralizes all five HTML-significant characters', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry');
  assert.equal(escapeHtml(`"quoted" 'and' <tagged>`), '&quot;quoted&quot; &#39;and&#39; &lt;tagged&gt;');
});

test('buildNotificationEmailHtml escapes both title and message', () => {
  const html = buildNotificationEmailHtml('<b>Bold title</b>', 'Body with <script>injected</script> content');
  assert.doesNotMatch(html, /<b>Bold title<\/b>/, 'title tag must not survive unescaped');
  assert.doesNotMatch(html, /<script>injected<\/script>/, 'message script tag must not survive unescaped');
  assert.match(html, /&lt;b&gt;Bold title&lt;\/b&gt;/);
  assert.match(html, /&lt;script&gt;injected&lt;\/script&gt;/);
});

test('buildNotificationEmailHtml converts newlines to <br> after escaping', () => {
  const html = buildNotificationEmailHtml('Title', 'Line one\nLine two\r\nLine three');
  assert.match(html, /Line one<br>Line two<br>Line three/);
});

test('buildNotificationEmailHtml linkifies a bare URL as a real, brand-colored anchor', () => {
  const html = buildNotificationEmailHtml('Verify your email', 'Open this link:\nhttps://sgconnectsphere.vercel.app/verify?token=abc123');
  assert.match(html, /<a href="https:\/\/sgconnectsphere\.vercel\.app\/verify\?token=abc123" style="color:#0e7c7b;">https:\/\/sgconnectsphere\.vercel\.app\/verify\?token=abc123<\/a>/);
});

test('buildNotificationEmailHtml trims one trailing sentence-punctuation character out of the link', () => {
  const html = buildNotificationEmailHtml('Title', 'See https://example.test/path.');
  assert.match(html, /<a href="https:\/\/example\.test\/path" style="color:#0e7c7b;">https:\/\/example\.test\/path<\/a>\./);
});

test('buildNotificationEmailHtml does not linkify a URL injected via message content differently than any other text -- it is still escaped first', () => {
  // A message trying to break out of the href attribute must not succeed:
  // the quote characters are escaped to &quot; before the linkify regex
  // ever runs, so there is no way to inject an extra attribute.
  const html = buildNotificationEmailHtml('Title', 'https://example.test/"onmouseover="alert(1)');
  assert.doesNotMatch(html, /href="[^"]*onmouseover="/, 'a literal unescaped quote must never terminate the href attribute early');
  assert.match(html, /&quot;onmouseover=&quot;/, 'the quote characters must be present in their escaped form');
});

test('buildNotificationEmailHtml output carries ConnectSphere branding and is a complete HTML document', () => {
  const html = buildNotificationEmailHtml('Hello', 'World');
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /ConnectSphere/);
  assert.match(html, /#0e7c7b/, 'brand teal token from frontend/src/styles.css must be present');
  assert.match(html, /<title>Hello<\/title>/);
  assert.match(html, /<h1[^>]*>Hello<\/h1>/);
});
