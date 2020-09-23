import PromisePool from '@supercharge/promise-pool';
import { gmail_v1 } from 'googleapis';
import prettyBytes from 'pretty-bytes';
import VError from 'verror';
import { getUrlsFromMessage } from './lib/extract_urls';
import { getFileUrls } from './lib/file_url';
import { getAllMessageIds, getMessage } from './lib/message';
import { getPublicUrls } from './lib/public_file_url';
import { getUniqueUrls } from './lib/unique_urls';
import { flatten } from './lib/util';

export async function scanEmails(gmail: gmail_v1.Gmail) {
  // [Error case] Promise fails
  const allMessageIds = await getAllMessageIds(gmail).catch((err: Error) => {
    const wrappedError = new VError(
      err,
      "Failed to get our email messages' IDs"
    );

    throw wrappedError;
  });

  console.log(`Found ${allMessageIds.length} messages to scan.\n`);

  // [Error case] Promise fails
  // Request all the messages, with only 40 requests in flight at a time to work around rate limits
  const {
    results: nestedListOfPublicFileUrls,
    errors,
  } = await PromisePool.withConcurrency(40)
    .for(allMessageIds)
    .process(
      async (messageId): Promise<string[]> => {
        const message = await getMessage(gmail, messageId).catch(
          (err: Error) => {
            console.log(err.message);
            return Promise.reject(err);
          }
        );

        // If we didn't get a message, return immediately as we can't continue
        // process this message
        if (!message) return [];

        const allUrls = await getUrlsFromMessage(gmail, message).catch(
          (err: Error) => {
            console.log(err.message);
            return Promise.reject(err);
          }
        );

        // Filter down to file URLs
        const fileUrls = getFileUrls(allUrls);

        // Filter down to public file URLs
        const publicFileUrls = await getPublicUrls(fileUrls).catch(
          (err: Error) => {
            console.log(err.message);
            return Promise.reject(err);
          }
        );

        // Convert the message's date to a easy-to-read format
        let humanReadableSize = 'unknown size';
        if (message?.sizeEstimate) {
          humanReadableSize = prettyBytes(message?.sizeEstimate);
        }

        let humanReadableDate = 'unknown date';
        if (message?.internalDate) {
          try {
            const msSinceEpoch = parseInt(message.internalDate);
            humanReadableDate = new Date(msSinceEpoch).toLocaleDateString();
          } catch {
            // likely caused by an error in parsing internalDate to integer. intentionally do nothing.
            // keep humanReadableDate set to 'unknown date'.
          }
        }

        let snippet = "couldn't get snippet";
        if (message.snippet) {
          snippet = message.snippet.substring(0, 60);
        }

        console.log(
          `Found ${publicFileUrls.length} public file URLs in message ${messageId} (${humanReadableSize}, created ${humanReadableDate}). Snippet: ${snippet}`
        );

        if (publicFileUrls.length > 0) {
          // Print out a newline
          console.log();

          // Print out the public file URLs from the message
          publicFileUrls.forEach((theUrl) => {
            console.log(theUrl);
          });

          // Print out another newline
          console.log();
        }

        return publicFileUrls;
      }
    );

  // Compute some basic stats
  const successfullyScanned = nestedListOfPublicFileUrls.length;
  const unsuccessfullyScanned = errors.length;
  const totalScanned = allMessageIds.length;

  // And print out our basic stats
  console.log('\n---');
  console.log(`Email messages scanned: ${totalScanned}`);
  console.log(`Scanned successfully: ${successfullyScanned}`);
  console.log(`Scanned unsuccessfully: ${unsuccessfullyScanned}`);

  // Remove duplicates
  const publicFileUrls = flatten(nestedListOfPublicFileUrls);
  const uniquePublicFileUrls = getUniqueUrls(publicFileUrls);

  console.log(
    `\nFound ${uniquePublicFileUrls.length} public Google Drive and Dropbox URLs in total:\n`
  );

  // Print out all the public file URLs we found
  uniquePublicFileUrls.forEach((theUrl) => console.log(theUrl));
}
