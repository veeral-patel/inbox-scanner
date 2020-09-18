import test from 'ava';
import { getUniqueUrls, stripQueryParameters } from '../lib/unique_urls';

test('Test stripping query parameters', (t) => {
  t.is(
    stripQueryParameters(
      'https://dropbox.com/scl/fi/m0q9rk3edqgtx6htguihx/Product-Frameworks.paper?dl=0&rlkey=1raczbqtantumxu8emnmgp72y'
    ),
    'https://dropbox.com/scl/fi/m0q9rk3edqgtx6htguihx/Product-Frameworks.paper'
  );
});

test('Test getting unique URLs', (t) => {
  t.deepEqual(
    getUniqueUrls([
      'https://docs.google.com/spreadsheets/abc',
      'https://docs.google.com/spreadsheets/abc?q=hello',
      'https://docs.google.com/spreadsheets/bcd?q=hello',
    ]),
    [
      'https://docs.google.com/spreadsheets/abc',
      'https://docs.google.com/spreadsheets/bcd',
    ]
  );
});
