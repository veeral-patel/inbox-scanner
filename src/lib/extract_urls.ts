import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import VError from 'verror';
import { flatten } from './util';

// [Testable]
export async function getUrlsFromMessages(
  gmail: gmail_v1.Gmail,
  messages: gmail_v1.Schema$Message[]
): Promise<string[]> {
  // [Error case] Promise fails

  // Request all the messages
  // TODO: add a catch clause
  const allResults = await Promise.allSettled(
    messages.map(async (message) => getUrlsFromMessage(gmail, message))
  );

  // Separate our promises based on whether they were fulfilled...
  const listOflistsOfUrls = allResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<string[]>).value);

  // Or failed
  const failedResults = allResults.filter(
    (result) => result.status === 'rejected'
  );

  // console.error each of our failed results
  failedResults.forEach((result) => {
    const theError = (result as PromiseRejectedResult).reason;
    console.error((theError as Error).message);
  });

  return flatten(listOflistsOfUrls);
}

// [Testable]
async function getUrlsFromMessage(
  gmail: gmail_v1.Gmail,
  message: gmail_v1.Schema$Message
) {
  if (!message.id || !message.payload) return [];

  // [Error case] Promise fails
  const text = await getText(gmail, message.id, message.payload).catch(
    (err: Error) => {
      const wrappedError = new VError(
        err,
        `Failed to extract the text from message ${message.id}`
      );

      throw wrappedError;
    }
  );

  const foundUrls: string[] = Array.from(getUrls(text));

  return foundUrls;
}

// [Not testing]
async function getAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<gmail_v1.Schema$MessagePartBody | null> {
  // [Error case] Promise fails
  const response = await gmail.users.messages.attachments
    .get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    })
    .catch((err: Error) => {
      const wrappedError = new VError(
        err,
        `Failed to fetch attachment ${attachmentId} from message ${messageId}`
      );

      throw wrappedError;
    });

  return response.data;
}

// [Make testable]
// Extracts the text from an email message by recursively parsing its MIME content tree
// and base64 decoding any plain text or html parts
async function getText(
  gmail: gmail_v1.Gmail,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart
): Promise<string> {
  if (!payload?.parts) {
    if (payload?.body?.data) {
      if (
        payload.mimeType === 'text/plain' ||
        payload.mimeType === 'text/html'
      ) {
        return base64Decode(payload.body.data);
      }
    } else {
      return '';
    }
  }

  var initialText: string = '';
  if (payload.body?.data) {
    initialText = base64Decode(payload.body?.data);
  }

  let piecesOfText: string[] = [];
  if (payload.parts) {
    // [Error case] Promise fails

    // TODO: add a catch clause
    const allResults = await Promise.allSettled(
      payload.parts.map(async (part) => {
        let text: string = '';

        if (part.filename) {
          // if this part represents an attachment, get the text from the attachment too!
          if (part.body?.attachmentId) {
            if (part.mimeType === 'text/plain') {
              // [Error case] Promise fails
              const attachment = await getAttachment(
                gmail,
                messageId,
                part.body.attachmentId
              ).catch((err: Error) => {
                // If we fail to get an attachment, skip the attachment and log to console
                console.error(
                  `Failed to scan attachment ${part.body?.attachmentId} in message ${messageId}: ${err.message}`
                );
              });

              if (attachment && attachment?.data) {
                text += base64Decode(attachment?.data);
              }
            }
          } else if (part.body?.data) {
            // base64 decode the attachment data from the part and then get text
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

            // [Error case] Promise fails
            const additionalText = await getText(gmail, messageId, part).catch(
              (_err) => {
                console.error(
                  `Failed to extract text from part ${part.partId} of message ${messageId}`
                );
              }
            );
            if (additionalText) text += additionalText;
          }
        }
        return text;
      })
    );

    // Separate our promises based on whether they were fulfilled...
    piecesOfText = allResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<string>).value);

    // Remember to include our original text in piecesOfText array!
    piecesOfText.push(initialText);

    // Or failed
    const failedResults = allResults.filter(
      (result) => result.status === 'rejected'
    );

    // console.error each of our failed results
    failedResults.forEach((result) => {
      const theError = (result as PromiseRejectedResult).reason;
      console.error((theError as Error).message);
    });
  }

  return piecesOfText.join('\n');
}

// Decodes a base64 encoded string. [Testable]
function base64Decode(input: string): string {
  let buff = new Buffer(input, 'base64');
  return buff.toString('ascii');
}
