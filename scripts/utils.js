/**
 * Verifies the webhook secret.
 * @param {string} webhookSecretFromHeader - The secret received in the webhook header.
 * @returns {boolean} True if the secret is valid, false otherwise.
 */
exports.verifyWebhookSecret = function (webhookSecretFromHeader) {
    let checkWebhooksSignature = config.get("checkWebhooksSignature");
    let configuredWebhookSecret = config.get("webhooksSigningSecret");

    if (!checkWebhooksSignature) {
        sys.logs.warn("[aistudio] Webhook signature verification is disabled");
        return true; // Allow if verification is disabled
    }

    if (!webhookSecretFromHeader) {
        sys.logs.warn('[aistudio] Webhook secret missing from header');
        return false;
    }


    return webhookSecretFromHeader === configuredWebhookSecret;
};

/**
 * Uploads a file using the HTTP service and returns the fileId.
 * Uses synchronous download to ensure fileId is returned directly.
 *
 * @param {string} fileId - The ID of the file to upload.
 * @returns {string} The ID of the uploaded file.
 */
exports.uploadFile = function(fileId) {
    let fileUploadResult = pkg.aistudio.api.post(
        '/files',
        {}, // no body needed, files are sent in settings.parts
        {
            settings: {
                multipart: true,
                downloadSync: true, // Synchronous download to get fileId immediately
                parts: [
                    { name: 'file', type: 'file', fileId: fileId }
                ]
            }
        }
    );

    if (!fileUploadResult || !fileUploadResult.fileId) {
        throw new Error("File upload failed.");
    }

    return fileUploadResult.fileId;
};
/**
 * Clear the cache of the agent information. Useful if you changed the inputs of the agents
 * and you need to update it faster than the regular 5 minutes update.
 *
 * @param {string} projectCode - The code of the project the agent belongs to.
 * @param {string} agentCode - The code of the agent to clear cache.
 * */
exports.clearAgentCache = function(projectCode, agentCode) {
    sys.storage.remove(`aistudio_agent_${projectCode}_${agentCode}`);
};