import urlModule from 'url';

// Gets the URLs that look like cloud based file urls. [Not testing]
export function getFileUrls(urls: string[]): string[] {
  return urls.filter(
    (theUrl) => isGoogleDriveFileUrl(theUrl) || isDropboxFileUrl(theUrl)
  );
}

// Outputs whether an URL is a Google Drive file url by simply checking
// if the URL contains one of a few substrings. [Testable]
export function isGoogleDriveFileUrl(theUrl: string): boolean {
  const ALLOWED_HOSTS = [
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'forms.google.com',
    'slides.google.com',
  ];

  try {
    const parsedUrl = urlModule.parse(theUrl);

    // see: https://nodejs.org/api/url.html#url_url_strings_and_url_objects

    // we want URLs which:
    // (1) have a non-empty pathname (pathname, not path, so query params alone don't count) and
    // (2) have one of the hosts above

    return (
      parsedUrl.pathname !== null &&
      parsedUrl.pathname !== '/' &&
      parsedUrl.host !== null &&
      ALLOWED_HOSTS.includes(parsedUrl.host)
    );
  } catch {
    // We (likely) failed to parse the URL
    return false;
  }
}

// Outputs whether an URL is a Dropbox file url by simply checking
// if the URL contains one of a few substrings. [Testable]
export function isDropboxFileUrl(theUrl: string): boolean {
  return ['dropbox.com/s/', 'dropbox.com/scl/'].some((host) =>
    theUrl.includes(host)
  );
}
