import test from 'ava';
import { isDropboxFileUrl, isGoogleDriveFileUrl } from '../lib/file_url';

test('Can check if URLs are Google Drive urls', (t) => {
  t.is(
    isGoogleDriveFileUrl(
      'https://docs.google.com/spreadsheets/d/1pV7xvIOA1X6c0syeXww5_fLhKvhRcwx6y6RX_IU_RPk/edit'
    ),
    true
  );
});

test('Can check if URLs are Dropbox urls', (t) => {
  t.is(
    isDropboxFileUrl(
      'https://www.dropbox.com/scl/fi/m0q9rk3edqgtx6htguihx/Master-Page.paper?dl=0&rlkey=1raczbqtantumxu8emnmgp72y'
    ),
    true
  );
});
