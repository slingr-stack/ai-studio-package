/**
 * Verifies the webhook secret.
 * @param {string} webhookSecretFromHeader - The secret received in the webhook header.
 * @returns {boolean} True if the secret is valid, false otherwise.
 */
exports.verifyWebhookSecret = function (webhookSecretFromHeader) {
    let checkWebhooksSignature = config.get("checkWebhooksSignature");
    let configuredWebhookSecret = config.get("webhooksSigningSecret");

    if (!checkWebhooksSignature) {
        sys.logs.warn("[ai-studio] Webhook signature verification is disabled");
        return true; // Allow if verification is disabled
    }

    if (!webhookSecretFromHeader) {
        sys.logs.warn('[ai-studio] Webhook secret missing from header');
        return false;
    }


    return webhookSecretFromHeader === configuredWebhookSecret;
};