# Overview

Repo: [https://github.com/slingr-stack/ai-studio-package](https://github.com/slingr-stack/ai-studio-package)

This package integrates with the AI Studio API, allowing you to interact with its features programmatically.  It provides convenient methods for making authenticated requests to the AI Studio API and handling webhook events.

The AI Studio package has the following features:

- Authentication using API Token or Email/Password credentials.
- Helper functions to simplify interaction with the AI Studio API.
- Webhook support for receiving real-time updates.


# Configuration

You'll need an AI Studio account to use this package. Configure the package with the appropriate settings described below.

## Authentication Method

Name: `authenticationMethod`

Choose how you want to authenticate with the AI Studio API:

- **API Token:** Use a predefined API token for authentication.
- **Credentials:**  Use your AI Studio email and password to log in.  The package will automatically refresh the token when it expires.

## API Token

Name: `apiToken`

(Required if `authenticationMethod` is "API Token") Enter your AI Studio API token.  Keep this secure.

## Email

Name: `email`

(Required if `authenticationMethod` is "Credentials") Your AI Studio email address.

## Password

Name: `password`

(Required if `authenticationMethod` is "Credentials")  Your AI Studio password.

## AI Studio API URL

Name: `aiStudioBaseUrl`

The base URL for the AI Studio API.  Defaults to `https://aistudio.slingrs.io/prod/runtime/api`.  Normally, you don't need to modify this setting.

## Webhook URL

Name: `webhookUrl`

This is the URL in your Slingr app that AI Studio will send webhooks to.  **Configure this URL in your AI Studio settings.**

## Check Webhooks Signature

Name: `checkWebhooksSignature`

Enable or disable webhook signature verification.  It is recommended to enable this for security.

## Webhooks Signing Secret

Name: `webhooksSigningSecret`

(Required if `checkWebhooksSignature` is enabled)  The shared secret used to sign webhooks.  **This must match the secret configured in your AI Studio webhook settings.**


# Javascript API

## HTTP requests

You can use the following methods to make requests to the AI Studio API:

```javascript
pkg.aistudio.api.get('/users'); // GET request
pkg.aistudio.api.post('/projects', { name: 'My Project' }); // POST request
pkg.aistudio.api.put('/projects/123', { status: 'completed' }); // PUT request
pkg.aistudio.api.delete('/projects/123'); // DELETE request
```

The package automatically handles authentication and includes the necessary headers.

Example using query parameters:

```javascript
pkg.aistudio.api.get('/projects?status=active&limit=10');
```

For more details about making HTTP requests, refer to the [HTTP service documentation](https://github.com/slingr-stack/http-service).


# Events

## Webhook

This event is triggered when AI Studio sends a webhook to your configured URL. The event data contains the raw payload sent by AI Studio.

Example:

```javascript
sys.events.on('aistudio:webhook', function(event) {
  sys.logs.info('Webhook received:', event.data);
  // Process the webhook data
});
```

# About Slingr

Slingr is a low-code rapid application development platform that accelerates development, with robust architecture for integrations and executing custom workflows and automation.

[More info about Slingr](https://slingr.io)

# License

This package is licensed under the Apache License 2.0. See the `LICENSE` file for more details.