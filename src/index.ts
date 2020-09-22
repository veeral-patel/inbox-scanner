import fs from 'fs';
import { gmail_v1 } from 'googleapis';
import http from 'http';
import open from 'open';
import VError from 'verror';
import { getUrlsFromMessages } from './lib/extract_urls';
import { getFileUrls } from './lib/file_url';
import { getMessages } from './lib/message';
import { getAuthUrl } from './lib/oauth';
import { getPublicUrls } from './lib/public_file_url';
import { getUniqueUrls } from './lib/unique_urls';

const PORT = 7777;

http
  .createServer((_request, response) => {
    fs.readFile('credentials.json', (err, content) => {
      // TODO: show an error to the user if we get an error here
      if (err) return console.log('Error loading client secret file:', err);

      const authUrl = getAuthUrl(JSON.parse(content.toString()));
      response.writeHead(302, {
        Location: authUrl,
      });
      response.end();
    });
  })
  .listen(PORT);

console.log('INBOX SCANNER\n');

console.log(
  'We scan your email inbox for public Google Drive and Dropbox file links.\n'
);

const urlOfServer = `http://localhost:${PORT}`;

console.log(`Visit ${urlOfServer} to get started.`);

open(urlOfServer);

async function scanEmails(gmail: gmail_v1.Gmail) {
  // [Error case] Promise fails
  const allMessages = await getMessages(gmail).catch((err: Error) => {
    const wrappedError = new VError(
      err,
      'Failed to retrieve your email messages'
    );
    console.error(wrappedError.message);
    process.exit();
  });

  console.log(`Got ${allMessages.length} message(s)`);

  // [Error case] Promise fails
  const allUrls = await getUrlsFromMessages(gmail, allMessages).catch(
    (err: Error) => {
      const wrappedError = new VError(
        err,
        'Failed to extract URLs from your email messages'
      );
      console.error(wrappedError.message);
      process.exit();
    }
  );

  console.log('all URLs:');
  console.log(allUrls);

  const fileUrls = getFileUrls(allUrls);

  console.log('file URLs:');
  console.log(fileUrls);

  // [Error case] Promise fails
  const publicUrls = await getPublicUrls(fileUrls).catch((err: Error) => {
    const wrappedError = new VError(
      err,
      'Failed to identify which of the file links in your email inbox are public'
    );
    console.error(wrappedError.message);
    process.exit();
  });

  console.log('public URLs:');
  console.log(publicUrls);

  const uniquePublicUrls = getUniqueUrls(publicUrls);

  console.log('unique public URLs:');
  console.log(uniquePublicUrls);
}
