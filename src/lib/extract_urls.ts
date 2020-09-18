import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';

// [Testable]
export async function getUrlsFromMessages(
  gmail: gmail_v1.Gmail,
  messages: gmail_v1.Schema$Message[]
): Promise<string[]> {
  const listOflistsOfUrls = await Bluebird.map(messages, async (message) => {
    if (message?.id && message?.payload) {
      // get the text from our email message
      const text = await getText(gmail, message.id, message.payload);

      // extract URLs from our text
      const newUrls: string[] = Array.from(getUrls(text));

      return newUrls;
    } else {
      return [];
    }
  });

  let allUrls: string[] = [];
  listOflistsOfUrls.forEach((lst) => {
    if (lst) allUrls = allUrls.concat(lst);
  });
  return allUrls;
}

// [Not testing]
async function getAttachment(
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
    piecesOfText = await Bluebird.map(payload.parts, async (part) => {
      let text: string = '';

      if (part.filename) {
        // if this part represents an attachment, get the text from the attachment too!
        if (part.body?.attachmentId) {
          if (part.mimeType === 'text/plain') {
            const attachment = await getAttachment(
              gmail,
              messageId,
              part.body.attachmentId
            );

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

          // also: wrap this await in a try/catch clause
          text += await getText(gmail, messageId, part);
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
