/**
 * Executes a task for a given agent with provided inputs.
 * @param {string} projectCode - The code of the project the agent belongs to.
 * @param {string} agentCode - The code of the agent to execute the task for.
 * @param {object} inputs - A map of input names to their values. For file inputs send the ID of the file.
 * @param {function} callback - The callback to be called when the task is ready. Webhooks have to be enabled.
 * @returns {string} The task ID
 */
exports.execute = function(projectCode, agentCode, inputs, callback) {
    // Find the agent by code using the API
    let agentsResponse = pkg.aistudio.api.get('/data/agents', {'project.code': projectCode, code: agentCode});

    if (!agentsResponse || !agentsResponse.items || agentsResponse.items.length === 0) {
        throw new Error('Agent not found for code: ' + agentCode);
    }

    let agent = agentsResponse.items[0];

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
            // Check if the provided value is a string (fileID)
            if (typeof inputValue !== 'string') {
                throw new Error('File input "' + inputName + '" must be a file ID (string).');
            }
            let uploadedFileId = pkg.aistudio.utils.uploadFile(inputValue);
            taskInputs.push({
                name: inputName,
                file: uploadedFileId
            });
        } else { // Assumed to be text if not a file type
            taskInputs.push({
                name: inputName,
                value: inputValue
            });
        }
    }

    // Create the task
    let task = {
        agent: agent.id, // Just the agent ID
        inputs: taskInputs
    };

    let createTaskResponse = pkg.aistudio.api.post('/data/tasks', task);
    let taskId = createTaskResponse.id;

    if (callback) {
        sys.storage.put(`aistudio_task_callback_${taskId}`, callback.toString(), {ttl: 1000 * 60 * 10});
    }

    return taskId;
};

/**
 * Waits for the task to be ready. It
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
    return taskResponse;
}