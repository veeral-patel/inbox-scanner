export * from './lib/async';
export * from './lib/number';

import fs from 'fs';
import { google } from 'googleapis';
import readline from 'readline';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  //   authorize(JSON.parse(content), listLabels);
  authorize(JSON.parse(content.toString()), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials: any, callback: any) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client: any, callback: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err: any, token: any) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

// Returns a promise that resolves to (1) the message IDs from the page with the associated page token
// and (2) the page token to use when retrieving our next set of message IDs.
async function getMessageIds(
  auth: any,
  pageToken: string | undefined
): Promise<[string[], string | undefined]> {
  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.list({
    userId: 'me',
    pageToken,
  });

  let messageIds: string[] = [];
  response.data.messages?.forEach((message) => {
    if (message.id) messageIds.push(message.id);
  });

  let nextPageToken = response.data.nextPageToken
    ? response.data.nextPageToken
    : undefined;

  return [messageIds, nextPageToken];
}

// Returns a promise that resolves to a list of all the email message IDs
// in the authenticated user's inbox.

// (Gmail forces us to make separate calls to retrieve the emails associated with each
// message ID.)
async function getAllMessageIds(auth: any): Promise<string[]> {
  let nextPageToken: string | undefined = undefined;
  let firstExecution = true;

  let allMessageIds: string[] = [];

  while (nextPageToken || firstExecution) {
    const [messageIds, newNextPageToken]: [
      string[],
      string | undefined
    ] = await getMessageIds(auth, nextPageToken);

    allMessageIds = allMessageIds.concat(messageIds);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

async function main(auth: any) {
  getAllMessageIds(auth).then((allMessageIds) => console.log(allMessageIds));
}
