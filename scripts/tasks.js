/**
 * Executes a task for a given agent with provided inputs.
 * @param {string} projectCode - The code of the project the agent belongs to.
 * @param {string} agentCode - The code of the agent to execute the task for.
 * @param {object} inputs - A map of input names to their values. For file inputs send the ID of the file.
 * @returns {string} The task ID
 */
exports.executeTask = function(projectCode, agentCode, inputs) {
    // Find the agent by code using the API
    let agentsResponse = pkg.aistudio.get('/data/agents', {'project.code': projectCode, code: agentCode});

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

    let createTaskResponse = pkg.aistudio.post('/data/tasks', task);

    return createTaskResponse.id;
};