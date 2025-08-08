/**
 * Executes a task for a given agent with provided inputs.
 * @param {string} projectCode - The code of the project the agent belongs to.
 * @param {string} agentCode - The code of the agent to execute the task for.
 * @param {object} inputs - A map of input names to their values. For file inputs send the ID of the file.
 * @param {object} callbackData - Data to pass to the callback function.
 * @param {function} callback - The callback to be called when the task is ready. Webhooks have to be enabled.
 * @returns {string} The task ID
 */
exports.execute = function(projectCode, agentCode, inputs, callbackData, callback) {
    // Load information of the agent to validate inputs
    let agent = sys.storage.get(`aistudio_agent_${projectCode}_${agentCode}`);
    if (!agent) {
        // Find the agent by code using the API
        let agentsResponse = pkg.aistudio.api.get(`/data/agents?project.code=${projectCode}&code=${agentCode}`);

        if (!agentsResponse || !agentsResponse.items || agentsResponse.items.length === 0) {
            throw new Error('Agent not found for code: ' + agentCode);
        }

        agent = agentsResponse.items[0];

        // Cache the agent information for 5 minutes. Useful when placing many tasks for the same agent
        sys.storage.put(`aistudio_agent_${projectCode}_${agentCode}`, agent, {ttl: 1000 * 60 * 5});
    }

    // Prepare task inputs
    let taskInputs = [];
    for (let inputName in inputs) {
        let inputValue = inputs[inputName];

        // Find the input definition in the agent
        let agentInputDef = agent.inputs.find(input => input.name === inputName);

        if (!agentInputDef) {
            throw new Error('Input not defined in agent: ' + inputName); // Handle undefined inputs
        }

        if (agentInputDef.type === 'file') {
            let fileIds = [];
            if (Array.isArray(inputValue)) {
                fileIds = inputValue
            } else {
                fileIds = [inputValue];
            }
            let uploadedFileIds = [];
            fileIds.forEach((fileId, index) => {
                // Check if the provided value is a string (fileID)
                if (typeof fileId !== 'string') {
                    throw new Error(`File input "${inputName}[${index}]" must be a file ID (string).`);
                }
                let uploadedFileId = pkg.aistudio.utils.uploadFile(fileId);
                uploadedFileIds.push(uploadedFileId);
            });
            taskInputs.push({
                name: inputName,
                files: uploadedFileIds
            });
        } else { // Assumed to be text if not a file type
            taskInputs.push({
                name: inputName,
                value: inputValue
            });
        }
    }

    // Adding caller info
    let callerInfo = {
        type: 'slingrApp',
        app: '${APP_NAME}',
        environment: '${APP_ENV}',
    };
    let currentUser = sys.context.getCurrentUserRecord();
    if (!currentUser.isSystemUser()) {
        callerInfo.userEmail = currentUser.field('email').val();
        if (agent.otherSettings && agent.otherSettings.requireUserToken) {
            let userToken = sys.storage.get(`aistudio_user_token_${currentUser.id()}`);
            if (!userToken) {
                let tokenResponse = sys.auth.createToken(currentUser);
                if (tokenResponse && tokenResponse.token) {
                    userToken = tokenResponse.token;
                    sys.storage.put(`aistudio_user_token_${currentUser.id()}`, userToken, {ttl: 1000 * 60 * 60 * 1});
                }
            }
            callerInfo.userToken = userToken;
        }
    }

    // Create the task
    let task = {
        agent: agent.id, // Just the agent ID
        inputs: taskInputs,
        callerInfo: callerInfo
    };

    let createTaskResponse = pkg.aistudio.api.post('/data/tasks', task);
    let taskId = createTaskResponse.id;

    if (callback) {
        if (callbackData) {
            sys.storage.put(`aistudio_task_callback_data_${taskId}`, callbackData, {ttl: 1000 * 60 * 10});
        }
        sys.storage.put(`aistudio_task_callback_${taskId}`, callback.toString(), {ttl: 1000 * 60 * 10});
    }

    return taskId;
};

/**
 * Adds a message to the task.
 * @param taskId {string} - The ID of the task to add a message.
 * @param files {string[]} - The ID of the files to send in the message. Optional.
 * @param message {string} - The message to add to the task.
 * @param options {string} - Options for this interaction (like overriding the model).
 * @param {object} callbackData - Data to pass to the callback function.
 * @param callback {function} - A callback to call when the response from the model is ready. Optional.
 */
exports.chat = function(taskId, files, message, options, callbackData, callback) {
    options = options || {};

    let body = {
        message: message
    };

    // If there are files, we need to upload them first
    if (files) {
        body.files = [];
        files.forEach(fileId => {
            let uploadedFileId = pkg.aistudio.utils.uploadFile(fileId);
            body.files.push(uploadedFileId);
        })
    }

    // If there are model settings, we need to convert the model code to model ID
    if (options.modelSettings == 'override') {
        if (!options.model) {
            throw new Error('No model providing when overriding model settings');
        }

        let modelsResponse = pkg.aistudio.api.get('/data/models', {code: options.model, _size: 1});

        if (!modelsResponse || !modelsResponse.items || modelsResponse.items.length === 0) {
            throw new Error('No model found with this code: ' + options.model);
        }

        options.model = modelsResponse.items[0].id;
        body.moreOptions = options;
    }

    pkg.aistudio.api.put(`/data/tasks/${taskId}/chat`, body);

    if (callback) {
        if (callbackData) {
            sys.storage.put(`aistudio_task_callback_data_${taskId}`, callbackData, {ttl: 1000 * 60 * 10});
        }
        sys.storage.put(`aistudio_task_callback_${taskId}`, callback.toString(), {ttl: 1000 * 60 * 10});
    }

    // Clear response in case there is an old one for this task
    sys.storage.remove(`aistudio_task_response_${taskId}`);

    return taskId;
};

/**
 * Waits for the task to be ready. It repeatedly checks the task status until the response is available or the timeout is reached.
 * @param {string} taskId - The ID of the task to wait for.
 * @param {number} timeout - Maximum time in milliseconds to wait for the task to be ready. An exception will be thrown. Default to 10 minutes.
 * @returns {string} The response of the task.
 */
exports.waitToBeReady = function(taskId, timeout) {
    timeout = timeout || (1000 * 60 * 5);
    let start = new Date().getTime();
    let taskResponse = sys.storage.get(`aistudio_task_response_${taskId}`);
    while (!taskResponse) {
        sys.utils.script.wait(100);
        let end = new Date().getTime();
        if ((end - start) > timeout) {
            throw `Waiting for task [${taskId}] to be ready took more than [${timeout}] ms`;
        }
        taskResponse = sys.storage.get(`aistudio_task_response_${taskId}`);
    }
    sys.storage.remove(`aistudio_task_response_${taskId}`);
    return taskResponse;
}