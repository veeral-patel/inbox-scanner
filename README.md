# Inbox Scanner

Scans a Gmail inbox for public Dropbox and Google Drive file links.

### To run the scanner:

```
# Clone repo, install dependencies
git clone http://github.com/veeral-patel/inbox-scanner && cd inbox-scanner
yarn install

# Compiles our (TypeScript) code into JS code we can run.
yarn build 
```

Next, we need to create an OAuth app so this program can access your inbox.

To do this, visit [this URL](https://developers.google.com/gmail/api/quickstart/nodejs) and click "Enable the Gmail API" under Step 1.

Select "Web server" on the "Configure your OAuth client" page" and enter
"http://localhost:7777/callback" under "Authorized redirect URIs".

Then, in the next step in the wizard, click "Download Client Configuration".
Save this file as credentials.json in your `inbox-scanner` folder.

Now, run our program:

```
yarn start
```

### Run all (unit) tests with:

```
yarn test
```

Note that you must run `yarn build` first
