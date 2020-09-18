import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import urlModule from 'url';
import { getAllMessageIds, getMessage } from './message';
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

    console.log(`Got ${newUrls.length} URLs from message ${messageId}`);

    return newUrls;
  }

  return [];
}

// Extracts all the URLs from an email inbox
export async function getAllUrls(gmail: gmail_v1.Gmail): Promise<string[]> {
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

// Removes the query parameters from a URL by parsing it and re-assembling it
function urlWithoutQueryParameters(theUrl: string): string {
  const parsedUrl = urlModule.parse(theUrl);
  return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
}

export function getUniqueUrls(urls: string[]) {
  let uniqueFileUrls: string[] = [];

  // Remove query params to identify duplicated URLs
  urls.forEach((ourUrl) => {
    const newUrl = urlWithoutQueryParameters(ourUrl);
    uniqueFileUrls.push(newUrl);
  });

  // Only leave unique URLs in our list
  uniqueFileUrls = Array.from(new Set(uniqueFileUrls));

  return uniqueFileUrls;
}
