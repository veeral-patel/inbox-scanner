import test from 'ava';
import { isDropboxFileLink, isGoogleDriveFileLink } from '../lib/file_link';

test('Can check if URLs are Google Drive links', (t) => {
  t.is(isGoogleDriveFileLink('https://docs.google.com'), false);
  t.is(
    isGoogleDriveFileLink(
      'https://docs.google.com/spreadsheets/d/1pV7xvIOA1X6c0syeXww5_fLhKvhRcwx6y6RX_IU_RPk/edit'
    ),
    true
  );
});

test('Can check if URLs are Dropbox links', (t) => {
  t.is(isDropboxFileLink('https://dropbox.com'), false);
  t.is(
    isDropboxFileLink(
      'https://www.dropbox.com/scl/fi/m0q9rk3edqgtx6htguihx/Master-Page.paper?dl=0&rlkey=1raczbqtantumxu8emnmgp72y'
    ),
    true
  );
});
