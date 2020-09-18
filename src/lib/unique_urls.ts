import urlModule from 'url';

// [Make testable]
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

// Removes the query parameters from a URL by parsing it and re-assembling it. [Testable]
function urlWithoutQueryParameters(theUrl: string): string {
  const parsedUrl = urlModule.parse(theUrl);
  return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
}
