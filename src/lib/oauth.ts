import { GaxiosError } from 'gaxios';
import { gmail_v1, google } from 'googleapis';
import open from 'open';

// The code is in this file is from Gmail's Node.js SDK quickstart.

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time
const TOKEN_PATH = 'token.json';

// Create an OAuth2 client with the given credentials, and then execute the
// given callback function [Not testing]
export function authorize(
  credentials: any,
  _callback: (gmail: gmail_v1.Gmail) => void
) {
  const { client_secret, client_id, redirect_uris } = credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.info(
    'Please grant access to your email account by authenticating at this URL.\n\nWe will open it for you automatically as well.\n'
  );
  console.info(authUrl);
  open(authUrl);
}

function oAuthCodeReceived(
  oAuth2Client: any,
  code: string,
  callback: (gmail: gmail_v1.Gmail) => void
) {
  oAuth2Client.getToken(code, (err: GaxiosError | null, token?: any) => {
    if (err)
      return console.error(`Error retrieving access token: ${err.message}`);
    else {
      oAuth2Client.setCredentials(token);

      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      callback(gmail);
    }
  });
}
