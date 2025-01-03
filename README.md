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
pkg.aistudio.api.get('/tasks'); // GET request
pkg.aistudio.api.post('/projects', { name: 'My Project' }); // POST request
pkg.aistudio.api.put('/projects/123/action', { name: 'New name' }); // PUT request
pkg.aistudio.api.delete('/projects/123'); // DELETE request
```

The package automatically handles authentication and includes the necessary headers.

For more details about making HTTP requests, refer to the [HTTP service documentation](https://github.com/slingr-stack/http-service).

## Tasks utilities

### Execute task

You can easily create a task like this:

```javascript
let taskId = pkg.aistudio.tasks.execute(projectCode, agentCode, inputs);  
```

Here, `inputs` is a map with the inputs needed by the agent. If the input is a file, you need to pass the file ID.

Additionally, you can pass a callback that will be called when the task is ready in an async way:

```javascript
pkg.aistudio.tasks.execute(projectCode, agentCode, inputs, function(taskId, response) {
    // do something with the response
});
```

Keep in mind that the callback is called async and the context is lost.

### Wait for task

It is possible to wait for a task to ready like this:

```javascript
let taskId = pkg.aistudio.tasks.execute(projectCode, agentCode, inputs);
let response = pkg.aistudio.tasks.waitToBeReady(taskId);
log(response);
```

By default, it will wait up to 5 minutes to find the response, but you can change that default using the second param:

```javascript
let taskId = pkg.aistudio.tasks.execute(projectCode, agentCode, inputs);
let response = pkg.aistudio.tasks.waitToBeReady(taskId, 1000 * 60 * 10);
log(response);
```

# Events

## Webhook

This event is triggered when AI Studio sends a webhook to your configured URL in the project. The event data contains the raw payload sent by AI Studio.

Example:

```javascript
sys.logs.info('Webhook received:', event.data.type);
```

As you can see, the `type` field will indicate the type of event. Look below for the types available.

### Task ready

Type: `taskReady`

When a task is ready, a webhook is sent with the following information:

```javascript
sys.logs.info(`Task ID: ${event.data.taskId}`);
sys.logs.info(`Callback executed: ${event.data.callbackExecuted}`);
sys.logs.info(`Response: ${event.data.response}`);
```

# About Slingr

Slingr is a low-code rapid application development platform that accelerates development, with robust architecture for integrations and executing custom workflows and automation.

[More info about Slingr](https://slingr.io)

# License

This package is licensed under the Apache License 2.0. See the `LICENSE` file for more details.