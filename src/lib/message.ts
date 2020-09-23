import { GaxiosError } from 'gaxios';
import { gmail_v1 } from 'googleapis';
import VError from 'verror';

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
      q: 'patrick', // to do: comment this out
    })
    .catch((err: GaxiosError) => {
      const wrappedError = new VError(
        `Failed to get batch of message IDs using page token ${pageToken}: ${err.message}`
      );
      throw wrappedError;
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
      // We intentionally don't wrap the error here as doing so wouldn't add any information
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
    .catch((err: GaxiosError) => {
      const wrappedError = new VError(
        `Failed to get the message with ID ${messageId}: ${err.message}`
      );
      throw wrappedError;
    });

  return response.data;
}

// Get a list of all the message in an email inbox. [Not testing]
export async function getMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  // [Error case] Promise fails
  const allMessageIds = await getAllMessageIds(gmail).catch((err: Error) => {
    const wrappedError = new VError(
      err,
      "Failed to get our email messages' IDs"
    );

    throw wrappedError;
  });

  // [Error case] Promise fails

  // Request all the messages
  const allResults = await Promise.allSettled(
    allMessageIds.map(async (messageId) => await getMessage(gmail, messageId))
  ).catch((err) => {
    // allSettled shouldn't error, but catch any errors just in case :)
    const wrappedError = new VError(err, 'Failed to get email messages');
    throw wrappedError;
  });

  // Separate our promises based on whether they were fulfilled...
  const messages = allResults
    .filter((result) => result.status === 'fulfilled')
    .map(
      (result) =>
        (result as PromiseFulfilledResult<gmail_v1.Schema$Message>).value
    );

  // Or failed
  const failedResults = allResults.filter(
    (result) => result.status === 'rejected'
  );

  // console.error each of our failed results
  failedResults.forEach((result) => {
    const theError = (result as PromiseRejectedResult).reason;
    console.error((theError as Error).message);
  });

  return messages;
}
