import fs from 'fs';
import { gmail_v1 } from 'googleapis';
import { getUrlsFromMessages } from './lib/extract_urls';
import { getFileUrls } from './lib/file_link';
import { getMessages } from './lib/message';
import { authorize } from './lib/oauth';
import { getPublicUrls } from './lib/public_file_link';
import { getUniqueUrls } from './lib/unique_urls';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content.toString()), main);
});

async function main(gmail: gmail_v1.Gmail) {
  const allMessages = await getMessages(gmail);

  const allUrls = await getUrlsFromMessages(gmail, allMessages);

  console.log('all URLs:');
  console.log(allUrls);

  const fileUrls = getFileUrls(allUrls);

  console.log('file URLs:');
  console.log(fileUrls);

  const publicUrls = await getPublicUrls(fileUrls);

  console.log('public URLs:');
  console.log(publicUrls);

  const uniquePublicUrls = getUniqueUrls(publicUrls);

  console.log('unique public URLs:');
  console.log(uniquePublicUrls);
}

// to do: handle errors properly (not with console.log)

// to do: create a gmail account and test my program against it
// also check against my real email account to see how long it takes

// I should have error handling every time I call a promise, whether with .catch or with try/catch in the case
// of async/await

// also: convert my code to use async/await instead of promises - DONE

// I also can have Gianluca or someone else code review my code to make sure it's high quality -  LATER

// I also want to remove "auth" as an argument from my methods - DONE

// Maybe - remove gmail as an argument from my methods - BUT HOW?

// To do: I should not have url as both a variable name and as an imported module - DONE

// I should move from Promise.all to Bluebird.map - DONE

// to do: remove console.log statements from lib/ - DONE

// to do: make my functions easier to test. remove side effects, try to create as many pure functions as I can
// that map some input to some output. minimize code paths in each function

// to do: write tests for my testable functions (need to break down)

// also: each function should be written at the right abstraction layer. don't violate abstraction barriers

// to do: look at any "to do" comments in my code - DONE

// to do: remove my q: "patrick6" query parameter

// to do: modify getAllUrls so it takes in a list of messages (maybe). want to
// have a chain: for each message: message > text > urls > file urls > public file urls
// > unique public file urls

// maybe: get travis CI working for this repo

// to do: remove console.log statements from all my lib/* files - DONE

// to do: choose either url or link but don't use both

// to do: look at my files in lib/. are the dependencies only one way, based on the layers above?
// that's what I want.

// to do: my lib/ module should only export these 5 functions
// getMessages, getAllUrls, getFileUrls, getPublicUrls, getUniqueUrls
