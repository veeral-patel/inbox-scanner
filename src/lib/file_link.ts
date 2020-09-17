// Gets the URLs that look like they're of cloud based file links
export function getFileLinks(urls: string[]): string[] {
  return urls.filter(
    (theUrl) => isGoogleDriveFileLink(theUrl) || isDropboxFileLink(theUrl)
  );
}

// Outputs whether an URL is a Google Drive file link by simply checking
// if the URL contains one of a few substrings
export function isGoogleDriveFileLink(theUrl: string): boolean {
  const REQUIRED_SUBSTRINGS: string[] = [
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'forms.google.com',
    'slides.google.com',
  ];

  return REQUIRED_SUBSTRINGS.some((host) => theUrl.includes(host));
}

// Outputs whether an URL is a Dropbox file link by simply checking
// if the URL contains one of a few substrings
export function isDropboxFileLink(theUrl: string): boolean {
  const REQUIRED_SUBSTRINGS = ['dropbox.com/s/', 'dropbox.com/scl/'];

  return REQUIRED_SUBSTRINGS.some((host) => theUrl.includes(host));
}
