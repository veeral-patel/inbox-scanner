import PromisePool from '@supercharge/promise-pool';
import express from 'express';
import fs from 'fs';
import { GaxiosError } from 'gaxios';
import { gmail_v1, google } from 'googleapis';
import prettyBytes from 'pretty-bytes';
import VError from 'verror';
import { getUrlsFromMessage } from './lib/extract_urls';
import { getFileUrls } from './lib/file_url';
import { getAllMessageIds, getMessage } from './lib/message';
import { getAuthUrl, getOAuthClient } from './lib/oauth';
import { getPublicUrls } from './lib/public_file_url';
import { getUniqueUrls } from './lib/unique_urls';
import { flatten } from './lib/util';

const PORT = 7777;

const app = express();

// Redirects you to a URL where you can log in and grant access via OAuth
app.get('/', (_req, res) => {
  // Read our OAuth app credentials...
  fs.readFile('credentials.json', (err, content) => {
    // And if we get an error reading this file, respond with a 500, log the error to
    // console, and shut down the server (as this error is un-recoverable.)
    if (err) {
      const wrappedError = new VError(
        err,
        "Failed to load client secret file. Please create a credentials.json file if one doesn't exist"
      );
      res.sendStatus(500);

      console.log(wrappedError.message);
      process.exit();
    } else {
      // Otherwise, generate a URL for the user to authenticate at and redirect to that URL
      const authUrl = getAuthUrl(JSON.parse(content.toString()));
      res.redirect(authUrl);
    }
  });
});

// After you grant access successfully, Google redirects your browser to this callback URL.
app.get('/callback', (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send('Failed to get code from the callback URL');
    return;
  }

  // Read our OAuth app credentials (again)...
  fs.readFile('credentials.json', (err, content) => {
    // And if we get an error reading this file, respond with a 500, log the error to
    // console, and shut down the server (as this error is un-recoverable.)
    if (err) {
      const wrappedError = new VError(
        err,
        "Failed to load client secret file. Please create a credentials.json file if one doesn't exist"
      );
      res.sendStatus(500);

      console.log(wrappedError.message);
      process.exit();
    } else {
      const oAuth2Client = getOAuthClient(JSON.parse(content.toString()));
      oAuth2Client.getToken(
        code as string,
        (err: GaxiosError | null, token?: any) => {
          if (err) {
            res.send(`Error retrieving access token: ${err.message}`);
            return;
          } else {
            oAuth2Client.setCredentials(token);

            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

            res.send('Scanning your emails now. Please visit your console.');

            scanEmails(gmail);
          }
        }
      );
    }
  });
});

// Start our server
app.listen(PORT, () => {
  // Once started, print out a welcome message
  console.log('INBOX SCANNER\n');

  console.log(
    'We scan your email inbox for public Google Drive and Dropbox file links.\n'
  );

  const urlOfServer = `http://localhost:${PORT}`;

  // Also print the URL of our server
  console.log(`Visit ${urlOfServer} to get started.\n`);
});

async function scanEmails(gmail: gmail_v1.Gmail) {
  console.log('Computing how many messages we need to scan...');

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
  // Request all the messages
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

        console.log(
          `Found ${publicFileUrls.length} public file URLs in message ${messageId} (${humanReadableSize}, created ${humanReadableDate}).`
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
