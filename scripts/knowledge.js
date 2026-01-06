/**
 * Create a new knowledge base in a project.
 *
 * @param {string} projectCode - The code of the project where the knowledge base will be created.
 * @param {string} name - The name of the knowledge base.
 * @param {object} metadata - Additional metadata for the knowledge base as key-value pairs. Only text and numbers supported.
 * @returns {object} Information of the created knowledge base.
 */
exports.createKnowledge = function(projectCode, name, metadata) {
  let projectResponse = pkg.aistudio.api.get(`/data/projects?code=${projectCode}`);
  if (!projectResponse || !projectResponse.items || projectResponse.items.length === 0) {
      throw new Error('Project not found for code: ' + projectCode);
  }
  let projectId = projectResponse.items[0].id;  
  let metadataArray = convertObjectToMetadataArray(metadata);
  let body = {
      project: projectId,
      name: name,
      metadata: metadataArray
  };
  return pkg.aistudio.api.post('/data/knowledge', body);
};

/**
 * Adds text data to the specified knowledge base.
 *
 * @param {string} knowledgeId - The ID of the knowledge base.
 * @param {string} title - The title of the data to be added.
 * @param {string} data - The text data to be added.
 * @param {object} metadata - Additional metadata for the data as key-value pairs. Only text and numbers supported.
 * @returns {object} Information of the added knowledge data.
 */
exports.addTextData = function(knowledgeId, title, data, metadata) {
  let metadataArray = convertObjectToMetadataArray(metadata);
  let params = {
      title: title,
      type: 'text',
      content: data,
      metadata: metadataArray
  };
  return pkg.aistudio.api.put(`/data/knowledge/${knowledgeId}/addData`, params);
};

/**
 * Adds file data to the specified knowledge base.
 *
 * @param {string} knowledgeId - The ID of the knowledge base.
 * @param {string} title - The title of the data to be added.
 * @param {string} fileId - The ID of the file to be added.
 * @param {object} metadata - Additional metadata for the data as key-value pairs. Only text and numbers supported.
 * @returns {object} Information of the added knowledge data.
 */
exports.addFileData = function(knowledgeId, title, fileId, metadata) {
  let uploadedFileId = pkg.aistudio.utils.uploadFile(fileId);
  let metadataArray = convertObjectToMetadataArray(metadata);
  let params = {
      title: title,
      type: 'file',
      file: uploadedFileId,
      metadata: metadataArray
  };
  return pkg.aistudio.api.put(`/data/knowledge/${knowledgeId}/addData`, params);
};

/**
 * Removes the specified knowledge data.
 *
 * @param {string} dataId - The ID of the knowledge data to be removed.
 */
exports.removeData = function(dataId) {
  pkg.aistudio.api.delete(`/data/knowledgeData/${dataId}`);
};

/**
 * @typedef {Object} ChunkingOptions
 * @property {('doNotChunk'|'numberOfCharacters'|'perPage'|'aiByTopic')} strategy - The strategy for chunking.
 * @property {number} quantity - The quantity for chunking.
 * @property {number} overlap - The overlap for chunking.
 */

/**
 * @typedef {Object} EmbeddingOptions
 * @property {('original'|'extractText'|'summarize'|'describe')} strategy - The strategy for the embedding part.
 * @property {number} maxWords - The max number of words for the embedding part if using the strategy `summarize` or `describe`.
 */


/**
 * @typedef {Object} StorageOptions
 * @property {('original'|'extractText'|'summarize'|'describe')} strategy - The strategy for the stored part.
 * @property {number} maxWords - The max number of words for the stored part if using the strategy `summarize` or `describe`.
 */

/**
 * Processes the knowledge data by chunking, embedding, and storing it based on the provided options.
 *
 * @param {string} dataId - The ID of the knowledge data to be processed.
 * @param {ChunkingOptions} chunkingOptions - The options for chunking the data.
 * @param {EmbeddingOptions} embeddingOptions - The options for embedding the data.
 * @param {StorageOptions} storageOptions - The options for storing the data.
 * @returns {object} Information of the job to process the data.
 */
exports.processData = function(dataId, chunkingOptions, embeddingOptions, storageOptions) {
  let params = {
      chunking: chunkingOptions,
      embedding: embeddingOptions,
      storage: storageOptions
  };
  return pkg.aistudio.api.put(`/data/knowledgeData/${dataId}/chunk`, params);
};

function convertObjectToMetadataArray(metadata) {
  let metadataArray = [];
  if (metadata) {
    for (let key in metadata) {
        let value = metadata[key];
        let type = typeof value === 'number' ? 'number' : 'text';
        let metadataItem = { key: key, type: type };
        if (type === 'number') {
            metadataItem.valueNumber = value;
        } else {
            metadataItem.valueText = value;
        }
        metadataArray.push(metadataItem);
    }
  }
  return metadataArray;
}