import Bluebird from 'bluebird';
// Returns a promise that resolves to (1) the message IDs from the page with the associated page token
import { gmail_v1 } from 'googleapis';

// and (2) the page token to use when retrieving our next set of message IDs.
export async function getMessageIds(
  gmail: gmail_v1.Gmail,
  pageToken: string | undefined
): Promise<[string[], string | undefined]> {
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
  response.data.messages?.forEach(
    (message) => message.id && messageIds.push(message.id)
  );

  // Also extract our next page token from our API response
  let nextPageToken = response.data.nextPageToken || undefined;

  return [messageIds, nextPageToken];
}

// Returns a promise that resolves to a list of all the email message IDs
// in the authenticated user's inbox.

// (Gmail forces us to make separate calls to retrieve the emails associated with each
// message ID.)
export async function getAllMessageIds(
  gmail: gmail_v1.Gmail
): Promise<string[]> {
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
    ] = await getMessageIds(gmail, nextPageToken);

    // Store our received message IDs into our list
    allMessageIds = allMessageIds.concat(messageIds);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

export async function getMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  const allMessageIds = await getAllMessageIds(gmail);

  const messages = await Bluebird.map(
    allMessageIds,
    async (messageId) => {
      const message = await getMessage(gmail, messageId);
      return message;
    },
    { concurrency: 40 }
  );

  let filteredMessages: gmail_v1.Schema$Message[] = [];
  messages.forEach((message) => message && filteredMessages.push(message));

  return filteredMessages;
}

// Fetches a message from our API given a message ID
export async function getMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message | null> {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
  });

  return response.data;
}

export async function getAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<gmail_v1.Schema$MessagePartBody | null> {
  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: attachmentId,
  });

  return response.data;
}
