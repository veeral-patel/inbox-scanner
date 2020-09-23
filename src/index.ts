import express from 'express';
import fs from 'fs';
import { GaxiosError } from 'gaxios';
import { gmail_v1, google } from 'googleapis';
import VError from 'verror';
import { getUrlsFromMessage } from './lib/extract_urls';
import { getFileUrls } from './lib/file_url';
import { getAllMessageIds, getMessage } from './lib/message';
import { getAuthUrl, getOAuthClient } from './lib/oauth';
import { getPublicUrls } from './lib/public_file_url';

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

      console.error(wrappedError.message);
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

      console.error(wrappedError.message);
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
  allMessageIds.map(async (messageId) => {
    const message = await getMessage(gmail, messageId).catch((err: Error) =>
      console.error(err.message)
    );

    // If getMessage failed, then don't run the rest of the code in this function
    if (!message) return;

    const allUrls = await getUrlsFromMessage(
      gmail,
      message
    ).catch((err: Error) => console.error(err.message));

    if (!allUrls) return;

    const fileUrls = getFileUrls(allUrls);

    if (!fileUrls) return;

    const publicFileUrls = await getPublicUrls(fileUrls).catch((err: Error) =>
      console.error(err.message)
    );

    if (!publicFileUrls) return;

    console.log(
      `Found ${publicFileUrls.length} public file URLs in message ${messageId}.`
    );
  });
}
