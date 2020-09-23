import { google } from 'googleapis';

// The code is in this file is from Gmail's Node.js SDK quickstart.

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function getOAuthClient(credentials: any) {
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
export function getAuthUrl(credentials: any) {
  const oAuth2Client = getOAuthClient(credentials);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  return authUrl;
}
