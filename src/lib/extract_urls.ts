import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import { getText } from './text';

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
