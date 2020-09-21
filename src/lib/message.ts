import Bluebird from 'bluebird';
import { gmail_v1 } from 'googleapis';
import { notEmpty } from './util';

// Returns a promise that resolves to (1) the message IDs from the page with the associated page token
// and (2) the page token to use when retrieving our next set of message IDs. [Not testing]
async function getMessageIds(
  gmail: gmail_v1.Gmail,
  pageToken: string | undefined
): Promise<[string[], string | undefined]> {
  // [Error case] Promise fails
  const response = await gmail.users.messages
    .list({
      userId: 'me',
      pageToken,
      includeSpamTrash: true,
      q: 'interview', // to do: comment this out
    })
    .catch((err: Error) => {
      throw err;
    });

  // Extract the message ID from each message object we receive and store our
  // message IDs into an array
  let messageIds: string[] = [];
  response.data.messages?.forEach(
    (message) => message.id && messageIds.push(message.id)
  );

  // Also extract our next page token from our API response
  let nextPageToken = response.data.nextPageToken || undefined;

  return [messageIds, nextPageToken];
}

// Returns a promise that resolves to a list of all the email message IDs
// in the authenticated user's inbox. [Not testing]

// (Gmail forces us to make separate calls to retrieve the emails associated with each
// message ID.)
async function getAllMessageIds(gmail: gmail_v1.Gmail): Promise<string[]> {
  let nextPageToken: string | undefined = undefined;
  let firstExecution = true;

  let allMessageIds: string[] = [];

  // Stop requesting the next set of message IDs from Gmail's API once we get an
  // empty next page token from the API
  while (nextPageToken || firstExecution) {
    // Request the next set of message IDs and next page token

    // [Error case] Promise fails
    const [messageIds, newNextPageToken]: [
      string[],
      string | undefined
    ] = await getMessageIds(gmail, nextPageToken).catch((err: Error) => {
      throw err;
    });

    // Store our received message IDs into our list
    allMessageIds = allMessageIds.concat(messageIds);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

// Fetches a message from our API given a message ID. [Not testing]
async function getMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message | null> {
  // [Error case] Promise fails
  const response = await gmail.users.messages
    .get({
      userId: 'me',
      id: messageId,
    })
    .catch((err: Error) => {
      throw err;
    });

  return response.data;
}

// Get a list of all the message in an email inbox. [Not testing]
export async function getMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  // [Error case] Promise fails
  const allMessageIds = await getAllMessageIds(gmail)
    .catch((err: Error) => {
      throw err;
    })

  // [Error case] Promise fails
  const messages = await Bluebird.map(
    allMessageIds,
    async (messageId) => await getMessage(gmail, messageId),
    { concurrency: 40 } // Limit our in-flight requests to avoid rate limit errors
  ).catch((err: Error) => {
    throw err;
  });

  return messages.filter(notEmpty);
}
