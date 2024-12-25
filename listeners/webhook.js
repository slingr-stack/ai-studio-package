/****************************************************
 Webhooks
 ****************************************************/

listeners.defaultWebhookAI = {
    label: 'Catch HTTP AI Studio events',
    type: 'service',
    options: {
        service: 'http',
        event: 'webhook',
        matching: {
            path: '/aistudio', // Ensure this path matches your setup
        }
    },
    callback: function(event) {
        let headers = event.data.headers;
        let webhookSecret = headers['AI-Studio-Webhook-Secret'];

        if (pkg.aistudio.utils.verifyWebhookSecret(webhookSecret)) {
            sys.events.triggerEvent("aistudio:webhook", event.data);
        } else {
            sys.logs.warn('[ai-studio] Invalid webhook secret');
        }
    }
};