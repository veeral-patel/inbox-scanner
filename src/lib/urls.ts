import Bluebird from 'bluebird';
import { gmail_v1 } from 'googleapis';
import { getAllMessageIds } from './message';

// Gets all the URLs from an email message, given its ID
async function getUrlsFromMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<string[] | never[] | undefined> {
  const message = await getMessage(gmail, messageId);

  if (message?.payload) {
    // get the text from our email message
    const text = await getText(gmail, messageId, message.payload);

    // extract URLs from our text
    const newUrls: string[] = Array.from(getUrls(text));

    console.log(`Got ${newUrls.length} URLs from message ${messageId}`);

    return newUrls;
  }

  return [];
}

// Extracts all the URLs from an email inbox
async function getAllUrls(gmail: gmail_v1.Gmail): Promise<string[]> {
  const allMessageIds = await getAllMessageIds(gmail);

  const listOfLists = await Bluebird.map(
    allMessageIds,
    (messageId) => getUrlsFromMessage(gmail, messageId),
    { concurrency: 40 }
  );

  let allUrls: string[] = [];
  listOfLists.forEach((lst) => lst && (allUrls = allUrls.concat(lst)));
  return allUrls;
}
