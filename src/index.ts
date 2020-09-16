import axios from 'axios';
import fs from 'fs';
import getUrls from 'get-urls';
import { gmail_v1, google } from 'googleapis';
import readline from 'readline';
import url from 'url';

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

  // Call Gmail's API
  const response = await gmail.users.messages.list({
    userId: 'me',
    pageToken,
    includeSpamTrash: true,
    q: 'docs.google.com',
  });

  // Extract the message ID from each message object we receive and store our
  // message IDs into an array
  let messageIds: string[] = [];
  response.data.messages?.forEach((message) => {
    if (message.id) messageIds.push(message.id);
  });

  // Also extract our next page token from our API response
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

  // Stop requesting the next set of message IDs from Gmail's API once we get an
  // empty next page token from the API
  while (nextPageToken || firstExecution) {
    // Request the next set of message IDs and next page token
    const [messageIds, newNextPageToken]: [
      string[],
      string | undefined
    ] = await getMessageIds(auth, nextPageToken);

    // TODO: Handle case if our API request fails

    // Store our received message IDs into our list
    allMessageIds = allMessageIds.concat(messageIds);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

// Fetches a message from our API given a message ID
async function getMessage(
  auth: any,
  messageId: string
): Promise<gmail_v1.Schema$Message> {
  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
  });

  // TODO: Handle case if our API request fails

  return response.data;
}

// Decodes a base64 encoded string
function base64Decode(input: string): string {
  let buff = new Buffer(input, 'base64');
  return buff.toString('ascii');
}

// Recursively traverses an email's payload (which is a tree of MIME parts) and returns
// combined text from the plain, html parts
function getText(payload: gmail_v1.Schema$MessagePart): string {
  if (!payload?.parts) {
    // TODO: should we check that the payload's mime type is plain or html?
    if (payload?.body?.data) {
      return base64Decode(payload.body.data);
    } else return '';
  }

  let text: string = '';
  if (payload.body?.data) {
    text += base64Decode(payload.body?.data);
  }
  payload.parts.forEach((part) => {
    if (part.mimeType === 'text/plain' || part.mimeType == 'text/html') {
      if (part.body?.data) {
        text += base64Decode(part.body?.data);
      }
    } else {
      text += getText(part);
    }
  });
  return text;
}

// Gets the URLs that look like they're of cloud based file links
function getFileUrls(urls: string[]): string[] {
  let fileUrls = urls.filter((theUrl) => {
    const parsed = url.parse(theUrl);
    const urlHost = parsed.host;

    const ALLOWED_HOSTS: string[] = [
      'drive.google.com',
      'docs.google.com',
      'sheets.google.com',
      'forms.google.com',
      'slides.google.com',
    ];

    if (!urlHost) return false;
    else return ALLOWED_HOSTS.includes(urlHost);
  });

  return fileUrls;
}

function getUniqueUrls(urls: string[]) {
  let uniqueFileUrls: string[] = [];

  // Re-assemble URLs to eliminate query parameters
  urls.forEach((ourUrl) => {
    const result = url.parse(ourUrl);
    const newUrl = `${result.protocol}//${result.host}${result.pathname}`;
    uniqueFileUrls.push(newUrl);
  });

  // Only leave unique URLs in our list
  uniqueFileUrls = Array.from(new Set(uniqueFileUrls));

  return uniqueFileUrls;
}

// Gets all the public URLs from a list of URLs
function getPublicUrls(urls: string[]): Promise<string[]> {
  return Promise.all(
    urls.map((url) =>
      axios
        .get(url)
        .then((response) => {
          let publicUrls = [];
          if (response.status >= 200 && response.status < 300) {
            publicUrls.push(url);
          }
          return publicUrls;
        })
        .catch((_err) => [])
    )
  )
    .then((listOfListsOfPublicUrls) => {
      let entireList: string[] = [];
      listOfListsOfPublicUrls.forEach(
        (ourList) => (entireList = entireList.concat(ourList))
      );
      return entireList;
    })
    .catch((_err) => []);
}

// Gets all the URLs from an email message, given its ID
async function getUrlsFromMessage(
  auth: any,
  messageId: string
): Promise<string[] | never[] | undefined> {
  const message = await getMessage(auth, messageId);

  if (message.payload) {
    // get the text from our email message
    const text = getText(message.payload);

    // extract URLs from our text
    const newUrls: string[] = Array.from(getUrls(text));

    return newUrls;
  } else {
    return [];
  }
}

// Extracts all the URLs from an email inbox
async function getAllUrls(auth: any): Promise<string[]> {
  const allMessageIds = await getAllMessageIds(auth);
  return Promise.all(
    allMessageIds.map((messageId) => getUrlsFromMessage(auth, messageId))
  )
    .then((listOfLists) => {
      let allUrls: string[] = [];
      listOfLists.forEach((lst) => lst && (allUrls = allUrls.concat(lst)));
      return allUrls;
    })
    .catch((_err) => []);
}

// Get all the inbox's email message IDs, then print the subject line for each one
async function main(auth: any) {
  const allUrls = await getAllUrls(auth);

  const fileUrls = getFileUrls(allUrls);

  const publicUrls = await getPublicUrls(fileUrls);

  const uniquePublicUrls = getUniqueUrls(publicUrls);

  console.log(uniquePublicUrls);
}

// later: handle errors properly (not with console.log)
// I should have error handling every time I call a promise, whether with .catch or with try/catch in the case
// of async/await
