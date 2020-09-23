import express from 'express';
import { GaxiosError } from 'gaxios';
import { google } from 'googleapis';
import VError from 'verror';
import { getAuthUrl, getOAuthClient } from './lib/oauth';
import { scanEmails } from './scanEmails';

const AUTH_PORT = 7777;
const CONSOLE_PORT = 9001;

const AUTH_URL = `http://localhost:${AUTH_PORT}`;
const CONSOLE_URL = `http://localhost:${CONSOLE_PORT}`;

const app = express();

// Redirects you to a URL where you can log in and grant access via OAuth
app.get('/', async (_req, res) => {
  // Otherwise, generate a URL for the user to authenticate at and redirect to that URL
  const authUrl = await getAuthUrl().catch((err) => {
    const wrappedError = new VError(
      err,
      'Failed to generate authentication URL'
    );

    res.send(wrappedError.message);
  });

  if (authUrl) res.redirect(authUrl);
});

// After you grant access successfully, Google redirects your browser to this callback URL.
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send('Failed to get code from the callback URL');
    return;
  }

  const oAuth2Client = await getOAuthClient().catch((err: Error) => {
    const wrappedError = new VError(err, 'Failed to create an OAuth client');

    res.send(wrappedError.message);
  });

  // Use the code to retrieve an OAuth token from Google
  if (oAuth2Client)
    oAuth2Client.getToken(
      code as string,
      (err: GaxiosError | null, token?: any) => {
        if (err) {
          const wrappedError = new VError(
            err,
            'Failed to retrieve access token from callback URL'
          );

          res.send(wrappedError.message);

          process.exit();
        } else {
          oAuth2Client.setCredentials(token);

          const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

          res.send(`Scanning your emails now. Please visit ${CONSOLE_URL}.`);

          scanEmails(gmail);
        }
      }
    );
});

// Start our (auth) server
app.listen(AUTH_PORT, () => {
  // Once started, print out a welcome message
  console.log('INBOX SCANNER\n');

  console.log(
    'We scan your email inbox for public Google Drive and Dropbox file links.\n'
  );

  // Also print the URL of our server
  console.log(`Visit ${AUTH_URL} to get started.\n`);
});
