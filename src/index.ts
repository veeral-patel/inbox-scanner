import fs from 'fs';
import { gmail_v1 } from 'googleapis';
import VError from 'verror';
import { getUrlsFromMessages } from './lib/extract_urls';
import { getFileUrls } from './lib/file_url';
import { getMessages } from './lib/message';
import { authorize } from './lib/oauth';
import { getPublicUrls } from './lib/public_file_url';
import { getUniqueUrls } from './lib/unique_urls';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content.toString()), main);
});

async function main(gmail: gmail_v1.Gmail) {
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
