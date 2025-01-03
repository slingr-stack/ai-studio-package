/****************************************************
 Webhooks
 ****************************************************/

listeners.defaultWebhookAIStudio = {
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
            let eventType = event.data.type;
            if (eventType == 'taskReady') {
                let taskId = event.data.taskId;
                // If this is an event of type taskReady we will try to find a callback for it
                let callback = sys.storage.get(`aistudio_task_callback_${taskId}`);
                if (callback) {
                    sys.logs.debug(`[aistudio] Callback found for task [${taskId}]`);
                    try {
                        let params = callback.slice(callback.indexOf('(') + 1, callback.indexOf(')'));
                        let body = callback.slice(callback.indexOf('{') + 1, callback.lastIndexOf('}'));
                        let callbackFunction = new Function(params, body);
                        callbackFunction(taskId, event.data.response);
                    } catch (e) {
                        sys.logs.error(`[aistudio] Error executing callback for task [${taskId}]`);
                    } finally {
                        sys.storage.remove(`aistudio_task_callback_${taskId}`);
                        event.data.callbackExecuted = true;
                    }
                } else {
                    event.data.callbackExecuted = false;
                }
                // We will also put the response in the storage in case someone is waiting for it (only 10 minutes)
                sys.storage.put(`aistudio_task_response_${taskId}`, event.data.response, {ttl: 1000 * 60 * 10});
            }
            // Then, we send the event
            sys.events.triggerEvent("aistudio:webhook", event.data);
        } else {
            sys.logs.warn('[aistudio] Invalid webhook secret');
        }
    }
};