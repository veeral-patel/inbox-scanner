import fs from 'fs';
import { gmail_v1, google } from 'googleapis';
import readline from 'readline';

// The code is in this file is from Gmail's Node.js SDK quickstart.

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time
const TOKEN_PATH = 'token.json';

// Create an OAuth2 client with the given credentials, and then execute the
// given callback function [Not testing]
export function authorize(
  credentials: any,
  callback: (gmail: gmail_v1.Gmail) => void
) {
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

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    callback(gmail);
  });
}

// Get and store new token after prompting for user authorization, and then
// execute the given callback with the authorized OAuth2 client. [Not testing]
function getNewToken(
  oAuth2Client: any,
  callback: (gmail: gmail_v1.Gmail) => void
) {
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
