/****************************************************
 Public helpers
 ****************************************************/


/**
 * Sends an HTTP GET request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the GET request to.
 * @param {object} httpOptions  - The options to be included in the GET request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the GET request. [optional]
 * @return {object}             - The response of the GET request.
 */
exports.get = function (path, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, null, httpOptions);
    return sendRequest('get', options, callbackData, callbacks);
};

/**
 * Sends an HTTP POST request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the POST request to.
 * @param {string} body         - The body of the requesy
 * @param {object} httpOptions  - The options to be included in the POST request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the POST request. [optional]
 * @return {object}             - The response of the POST request.
 */
exports.post = function (path, body, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, body, httpOptions);
    return sendRequest('post', options, callbackData, callbacks);
};

/**
 * Sends an HTTP PUT request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the PUT request to.
 * @param {string} body         - The body of the requesy
 * @param {object} httpOptions  - The options to be included in the PUT request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the POST request. [optional]
 * @return {object}             - The response of the PUT request.
 */
exports.put = function (path, body, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, body, httpOptions);
    return sendRequest('put', options, callbackData, callbacks);
};

/**
 * Sends an HTTP PATCH request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the PATCH request to.
 * @param {string} body         - The body of the requesy
 * @param {object} httpOptions  - The options to be included in the PATCH request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the POST request. [optional]
 * @return {object}             - The response of the PATCH request.
 */
exports.patch = function (path, body, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, body, httpOptions);
    return sendRequest('patch', options, callbackData, callbacks);
};

/**
 * Sends an HTTP DELETE request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the DELETE request to.
 * @param {object} httpOptions  - The options to be included in the DELETE request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the DELETE request. [optional]
 * @return {object}             - The response of the DELETE request.
 */
exports.delete = function (path, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, null, httpOptions);
    return sendRequest('delete', options, callbackData, callbacks);
};

/**
 * Sends an HTTP HEAD request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the HEAD request to.
 * @param {object} httpOptions  - The options to be included in the HEAD request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the HEAD request. [optional]
 * @return {object}             - The response of the HEAD request.
 */
exports.head = function (path, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, null, httpOptions);
    return sendRequest('head', options, callbackData, callbacks);
};

/**
 * Sends an HTTP OPTIONS request to the specified URL with the provided HTTP options.
 *
 * @param {string} path         - The path to send the OPTIONS request to.
 * @param {object} httpOptions  - The options to be included in the OPTIONS request check http-service documentation.
 * @param {object} callbackData - Additional data to be passed to the callback functions. [optional]
 * @param {object} callbacks    - The callback functions to be called upon completion of the OPTIONS request. [optional]
 * @return {object}             - The response of the OPTIONS request.
 */
exports.options = function (path, httpOptions, callbackData, callbacks) {
    let options = checkHttpOptions(path, null, httpOptions);
    return sendRequest('options', options, callbackData, callbacks);
};

/****************************************************
 Request hanlder
 ****************************************************/

let cachedToken;

function sendRequest(method, options, callbackData, callbacks) {
    options.method = method;
    try {
        options = aiStudio(options);
        return dependencies.http[method](options, callbackData, callbacks);
    } catch (error) {
        if (error.additionalInfo && error.additionalInfo.status === 401 && config.get('authenticationMethod') === 'credentials') {
            sys.logs.debug('[aistudio] Token expired, renewing token...');
            refreshToken();
            options = setRequestHeaders(options); // Update headers with new token
            return dependencies.http[method](options, callbackData, callbacks);
        } else if (isConnectionTimeout(error)) {
            // if this is a connection timeout, we will simply retry one more time
            sys.logs.warn('[aistudio] Connection timeout. Retrying');
            return dependencies.http[method](options, callbackData, callbacks);
        } else {
            throw error;
        }
    }
}


function isConnectionTimeout(e) {
    if (sys.exceptions.getMessage(e).indexOf('Response does not arrive') != -1) {
        return true;
    }
    return false;
}

let aiStudio = function (options) {
    options = options || {};
    options = setApiUri(options);
    options = setRequestHeaders(options);
    // we will increase the connection timeout by default
    options.settings = options.settings || {};
    options.settings.connectionTimeout = 1000 * 60; // 60 seconds
    return options;
}

function setApiUri(options) {
    // Only set the URL if it doesn't come in the options already
    if (!options.url) {
        let API_URL = config.get("aiStudioBaseUrl");
        let url = options.path || "";
        options.url = API_URL + url;
        sys.logs.debug('[aistudio] Set URL: ' + options.path + "->" + options.url);
    }
    return options;
}

function setRequestHeaders(options) {
    let headers = options.headers || {};

    if (config.get('authenticationMethod') === 'apiToken') {
        sys.logs.debug('[aistudio] Set token header');
        headers = mergeJSON(headers, {"token": config.get("apiToken")});
    } else if (config.get('authenticationMethod') === 'credentials' && cachedToken) {
        sys.logs.debug('[aistudio] Set token header from credentials');
        headers = mergeJSON(headers, {"token": cachedToken});
    }


    options.headers = headers;
    return options;
}


function refreshToken() {
    let email = config.get('email');
    let password = config.get('password');
    let path = '/auth/login';

    let options = checkHttpOptions(path, { email: email, password: password });
    options = aiStudio(options);

    let response = dependencies.http.post(options);
    cachedToken = response.token;

}


/****************************************************
 Private helpers
 ****************************************************/

function checkHttpOptions(path, body, options) {
    options = options || {};
    if (!!path) {
        if (path.startsWith('http://') || path.startsWith('https://')) {
            // This is an absolute URL and we need to set it as the URL
            options.url = path;
        } else {
            options.path = path;
        }
    }
    if (!!body) {
        options.body = body;
    }
    return options;
}

function mergeJSON(json1, json2) {
    let result = {};
    let key;
    for (key in json1) {
        if (json1.hasOwnProperty(key)) result[key] = json1[key];
    }
    for (key in json2) {
        if (json2.hasOwnProperty(key)) result[key] = json2[key];
    }
    return result;
}