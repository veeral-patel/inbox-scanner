import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { VError } from 'verror';

const fsPromises = fs.promises;

// The code is in this file is from Gmail's Node.js SDK quickstart.

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export async function getOAuthClient(): Promise<OAuth2Client> {
  const content = await fsPromises.readFile('credentials.json').catch((err) => {
    const wrappedError = new VError(
      err,
      "Failed to load client secret file. Please create a credentials.json file if one doesn't exist"
    );

    throw wrappedError;
  });

  const credentials: any = JSON.parse(content.toString());
  const { client_secret, client_id, redirect_uris } = credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  return oAuth2Client;
}

// Create an OAuth2 client with the given credentials, and then execute the
// given callback function [Not testing]
export async function getAuthUrl(): Promise<string> {
  const oAuth2Client = await getOAuthClient().catch((err) => {
    throw new VError(err, 'Failed to create an OAuth client');
  });

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  return authUrl;
}
