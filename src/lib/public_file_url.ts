import axios from 'axios';
import Bluebird from 'bluebird';
import { isDropboxFileUrl, isGoogleDriveFileUrl } from './file_url';
import { notEmpty } from './util';

// [Testable]
async function isPublicDropboxFileUrl(theUrl: string): Promise<boolean> {
  if (isDropboxFileUrl(theUrl)) {
    // [Error case] Promise fails
    const response = await axios.get(theUrl);

    // note that we don't check if the response's an error, intentionally
    // an error means we got a 4xx or 5xx which just tells us our URL is not public

    return response.status === 301;
  }
  return false;
}

// [Testable]
async function isPublicGoogleDriveFileUrl(theUrl: string) {
  if (isGoogleDriveFileUrl(theUrl)) {
    // [Error case] Promise fails
    const response = await axios.get(theUrl);

    // note that we don't check if the response's an error, intentionally
    // an error means we got a 4xx or 5xx which just tells us our URL is not public

    return response.status === 200;
  }
  return false;
}

// Gets all the public URLs from a list of URLs. [Testable]
export async function getPublicUrls(urls: string[]): Promise<string[]> {
  // [Error case] Promise fails

  // TODO: move to Promise.allSettled
  const publicUrls = await Bluebird.map(urls, (theUrl) => {
    if (isPublicDropboxFileUrl(theUrl) || isPublicGoogleDriveFileUrl(theUrl))
      return theUrl;
    return null;
  }).catch((err: Error) => {
    throw err;
  });

  return publicUrls.filter(notEmpty);
}
