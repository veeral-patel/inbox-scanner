import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import { getMessage } from './message';
import { getText } from './text';

// Gets all the URLs from an email message, given its ID
export async function getUrlsFromMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<string[] | never[] | undefined> {
  const message = await getMessage(gmail, messageId);

  if (message?.payload) {
    // get the text from our email message
    const text = await getText(gmail, messageId, message.payload);

    // extract URLs from our text
    const newUrls: string[] = Array.from(getUrls(text));

    return newUrls;
  }

  return [];
}

export async function getAllUrls(
  gmail: gmail_v1.Gmail,
  allMessageIds: string[]
): Promise<string[]> {
  const listOfLists = await Bluebird.map(
    allMessageIds,
    (messageId) => getUrlsFromMessage(gmail, messageId),
    { concurrency: 40 }
  );

  let allUrls: string[] = [];
  listOfLists.forEach((lst) => lst && (allUrls = allUrls.concat(lst)));
  return allUrls;
}
