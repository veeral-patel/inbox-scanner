import Bluebird from 'bluebird';
import getUrls from 'get-urls';
import { gmail_v1 } from 'googleapis';
import { getMessage } from './message';
import { getText } from './text';

export async function getUrlsFromMessages(
  gmail: gmail_v1.Gmail,
  messageIds: string[]
): Promise<string[]> {
  const listOfLists = await Bluebird.map(
    messageIds,
    async (messageId) => {
      const message = await getMessage(gmail, messageId);

      if (message?.payload) {
        // get the text from our email message
        const text = await getText(gmail, messageId, message.payload);

        // extract URLs from our text
        const newUrls: string[] = Array.from(getUrls(text));

        return newUrls;
      }

      return [];
    },
    { concurrency: 40 }
  );

  let allUrls: string[] = [];
  listOfLists.forEach((lst) => lst && (allUrls = allUrls.concat(lst)));
  return allUrls;
}
