import urlModule from 'url';
import { withoutDuplicates } from './util';

// [Testable]
export function getUniqueUrls(urls: string[]) {
  const urlsWithoutQueryParams = urls.map((theUrl) =>
    stripQueryParameters(theUrl)
  );

  return withoutDuplicates(urlsWithoutQueryParams);
}

// Removes the query parameters from a URL by parsing it and re-assembling it. [Testable]
export function stripQueryParameters(theUrl: string): string {
  // [Error case] What if we fail to parse theUrl (b/c it's not valid)?
  const parsedUrl = urlModule.parse(theUrl);
  return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
}
