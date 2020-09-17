import axios from 'axios';
import { Promise as Bluebird } from 'bluebird';
import fs from 'fs';
import getUrls from 'get-urls';
import { OAuth2Client } from 'google-auth-library';
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
  auth: OAuth2Client,
  pageToken: string | undefined
): Promise<[string[], string | undefined]> {
  const gmail = google.gmail({ version: 'v1', auth });

  // Call Gmail's API
  const response = await gmail.users.messages.list({
    userId: 'me',
    pageToken,
    includeSpamTrash: true,
    q: 'patrick6', // to do: comment this out
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
async function getAllMessageIds(auth: OAuth2Client): Promise<string[]> {
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

    console.log(`Got ${allMessageIds.length} message IDs so far`);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

// Fetches a message from our API given a message ID
async function getMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<gmail_v1.Schema$Message | null> {
  const gmail = google.gmail({ version: 'v1', auth });

  return gmail.users.messages
    .get({
      userId: 'me',
      id: messageId,
    })
    .then((response) => {
      return response.data;
    })
    .catch((err) => {
      console.log(`Failed to get message with ID ${messageId}: ${err}`);
      return null;
    });

  // TODO: Handle case if our API request fails
}

// Decodes a base64 encoded string
function base64Decode(input: string): string {
  let buff = new Buffer(input, 'base64');
  return buff.toString('ascii');
}

// Recursively traverses an email's payload (which is a tree of MIME parts) and returns
// combined text from the plain, html parts
function getText(
  auth: OAuth2Client,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart
): Promise<string> {
  if (!payload?.parts) {
    // TODO: should we check that the payload's mime type is plain or html?
    return new Promise((resolve, _reject) => {
      if (payload?.body?.data) {
        resolve(base64Decode(payload.body.data));
      } else {
        resolve('');
      }
    });
  }

  var initialText: string = '';
  if (payload.body?.data) {
    initialText = base64Decode(payload.body?.data);
  }

  return (
    Promise.all(
      payload.parts.map(async (part) => {
        let text: string = '';

        if (part.filename) {
          // if this part represents an attachment, get the text from the attachment too!
          if (part.body?.attachmentId) {
            if (part.mimeType === 'text/plain') {
              // to do: fetch the attachment in a separate call and then get text
              const attachment = await getAttachment(
                auth,
                messageId,
                part.body.attachmentId
              );

              if (attachment?.data) {
                text += base64Decode(attachment?.data);
              }
            }
          } else if (part.body?.data) {
            // to do: base64 decode the attachment data from the part and then get text
            if (part.mimeType === 'text/plain') {
              if (part.body?.data) {
                text += base64Decode(part.body?.data);
              }
            }
          }
        } else {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            if (part.body?.data) {
              text += base64Decode(part.body?.data);
            }
          } else {
            // it's either a container part so we get the text from its subparts
            // or it's a part we don't care about, which doesn't have sub-parts, so getText(...) will output an empty string

            // also: wrap this await in a try/catch clause
            text += await getText(auth, messageId, part);
          }
        }
        return text;
      })
    )
      .then((values) => {
        return values.join('\n');
      })
      // to do: handle this error
      .catch((_err) => '')
  );
}

async function getAttachment(
  auth: OAuth2Client,
  messageId: string,
  attachmentId: string
): Promise<gmail_v1.Schema$MessagePartBody | null> {
  const gmail = google.gmail({ version: 'v1', auth });
  return gmail.users.messages.attachments
    .get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    })
    .then((response) => response.data)
    .catch((_err) => {
      console.log(`Failed to get attachment with ID ${attachmentId}`);
      return null;
    });
}

// Gets the URLs that look like they're of cloud based file links
function getFileUrls(urls: string[]): string[] {
  let fileUrls = urls.filter((theUrl) => {
    const parsed = url.parse(theUrl);
    const urlHost = parsed.host;

    if (!urlHost) return false;

    const GOOGLE_DRIVE_HOSTNAMES: string[] = [
      'drive.google.com',
      'docs.google.com',
      'sheets.google.com',
      'forms.google.com',
      'slides.google.com',
    ];

    const isGoogleDriveFile = GOOGLE_DRIVE_HOSTNAMES.includes(urlHost);
    const isDropboxFile =
      theUrl.includes('dropbox.com/s/') || theUrl.includes('dropbox.com/scl/');

    return isGoogleDriveFile || isDropboxFile;
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
    urls.map((url) => {
      console.log(`Checking if url ${url} is public`);
      return axios
        .get(url)
        .then((response) => {
          let publicUrls = [];
          if (response.status >= 200 && response.status <= 301) {
            console.log(`Found public URL: ${url}`);
            publicUrls.push(url);
          }
          return publicUrls;
        })
        .catch((err) => {
          console.log(
            `Error occurred when fetching URL ${url} to check if it's public: ${err}`
          );
          return [];
        });
    })
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
  auth: OAuth2Client,
  messageId: string
): Promise<string[] | never[] | undefined> {
  const message = await getMessage(auth, messageId);

  if (message && message.payload) {
    // get the text from our email message
    const text = await getText(auth, messageId, message.payload);

    // extract URLs from our text
    const newUrls: string[] = Array.from(getUrls(text));

    console.log(`Got ${newUrls.length} URLs from message ${messageId}`);

    return newUrls;
  } else {
    return [];
  }
}

// Extracts all the URLs from an email inbox
async function getAllUrls(auth: OAuth2Client): Promise<string[]> {
  const allMessageIds = await getAllMessageIds(auth);
  return Bluebird.map(
    allMessageIds,
    (messageId) => getUrlsFromMessage(auth, messageId),
    { concurrency: 40 }
  )
    .then((listOfLists) => {
      let allUrls: string[] = [];
      listOfLists.forEach((lst) => lst && (allUrls = allUrls.concat(lst)));
      return allUrls;
    })
    .catch((_err) => []);
}

// Get all the inbox's email message IDs, then print the subject line for each one
async function main(auth: OAuth2Client) {
  const allUrls = await getAllUrls(auth);

  console.log('all URLs:');
  console.log(allUrls);

  const fileUrls = getFileUrls(allUrls);

  console.log('file URLs:');
  console.log(fileUrls);

  const publicUrls = await getPublicUrls(fileUrls);

  console.log('public URLs:');
  console.log(publicUrls);

  const uniquePublicUrls = getUniqueUrls(publicUrls);

  console.log('unique public URLs:');
  console.log(uniquePublicUrls);
}

// later: handle errors properly (not with console.log)

// I should have error handling every time I call a promise, whether with .catch or with try/catch in the case
// of async/await

// also: convert my code to use async/await instead of promises

// I also can have Gianluca or someone else comment on my code to make sure it's high quality

// I also want to remove "auth" as an argument from my methods
