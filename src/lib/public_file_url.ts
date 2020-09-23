import axios from 'axios';
import VError from 'verror';
import { isDropboxFileUrl, isGoogleDriveFileUrl } from './file_url';

// [Testable]
async function isPublicDropboxFileUrl(theUrl: string): Promise<boolean> {
  if (isDropboxFileUrl(theUrl)) {
    // [Error case] Promise fails
    const response = await axios.get(theUrl).catch((_err) => {
      // note that we don't check if the response's an error, intentionally
      // an error means we got a 4xx or 5xx which just tells us our URL is not public
    });

    // note that we don't check if the response's an error, intentionally
    // an error means we got a 4xx or 5xx which just tells us our URL is not public

    if (response) return response.status === 301;
    return false;
  }
  return false;
}

// [Testable]
async function isPublicGoogleDriveFileUrl(theUrl: string) {
  if (isGoogleDriveFileUrl(theUrl)) {
    // [Error case] Promise fails
    const response = await axios.get(theUrl).catch((_err) => {
      // note that we don't check if the response's an error, intentionally
      // an error means we got a 4xx or 5xx which just tells us our URL is not public
    });

    if (response) return response.status === 200;
    return false;
  }
  return false;
}

// Gets all the public URLs from a list of URLs. [Testable]
export async function getPublicUrls(urls: string[]): Promise<string[]> {
  // [Error case] Promise fails

  const allResults = await Promise.allSettled(
    urls.map((theUrl) => {
      if (isPublicDropboxFileUrl(theUrl) || isPublicGoogleDriveFileUrl(theUrl))
        return theUrl;
      return null;
    })
  ).catch((err) => {
    // allSettled shouldn't error, but catch any errors just in case :)
    const wrappedError = new VError(
      err,
      'Failed to determine which file links were public'
    );
    throw wrappedError;
  });

  // Separate our promises based on whether they were fulfilled...
  const publicUrls = allResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<string>).value);

  // Or failed
  const failedResults = allResults.filter(
    (result) => result.status === 'rejected'
  );

  // console.log each of our failed results
  failedResults.forEach((result) => {
    const theError = (result as PromiseRejectedResult).reason;
    console.log((theError as Error).message);
  });

  return publicUrls;
}
