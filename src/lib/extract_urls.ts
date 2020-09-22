import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import { flatten } from './util';

// [Testable]
export async function getUrlsFromMessages(
  gmail: gmail_v1.Gmail,
  messages: gmail_v1.Schema$Message[]
): Promise<string[]> {
  // [Error case] Promise fails

  // TODO: use Promise.allSettled
  const listOflistsOfUrls: string[][] = await Bluebird.map(
    messages,
    async (message) => getUrlsFromMessage(gmail, message)
  ).catch((err: Error) => {
    throw err;
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
      throw err;
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
      throw err;
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
  if (payload.parts)
    // [Error case] Promise fails

    // TODO: use Promise.allSettled
    piecesOfText = await Bluebird.map(payload.parts, async (part) => {
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
              throw err;
            });

            if (attachment?.data) {
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
            (err: Error) => {
              throw err;
            }
          );
          text += additionalText;
        }
      }
      return text;
    });

  piecesOfText.push(initialText);
  return piecesOfText.join('\n');
}

// Decodes a base64 encoded string. [Testable]
function base64Decode(input: string): string {
  let buff = new Buffer(input, 'base64');
  return buff.toString('ascii');
}
