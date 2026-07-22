'use strict';

var urlModule = require('url');

var URL = urlModule.URL;
var URLSearchParams = urlModule.URLSearchParams;

module.exports = createClient({});

function createClient(defaultOptions) {
    var client = function (options, cb) {
        send(null, defaultOptions, options, cb);
    };

    [ 'get', 'post', 'put', 'del', 'patch', 'head' ].forEach(function (name) {
        client[name] = function (options, cb) {
            send(name === 'del' ? 'DELETE' : name.toUpperCase(), defaultOptions, options, cb);
        };
    });

    client.defaults = function (options) {
        return createClient(mergeOptions(defaultOptions, options || {}));
    };

    return client;
}

function send(method, defaultOptions, requestOptions, cb) {
    var options = normalizeOptions(defaultOptions, requestOptions);
    var url = addQuery(options.url || options.uri, options.qs);
    var headers = createHeaders(options);
    var body = createBody(options, headers);
    var controller;
    var timeout;
    var timedOut = false;
    var externalAbortHandler;
    var fetchOptions = {
        method: method || options.method || 'GET',
        headers: headers,
        redirect: options.followRedirect === false || options.followAllRedirects === false ? 'manual' : 'follow'
    };

    if (!url) {
        return process.nextTick(function () {
            cb(new Error('A request URL is required'));
        });
    }

    if (body !== undefined && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
        fetchOptions.body = body;
    }

    if (options.dispatcher) {
        fetchOptions.dispatcher = options.dispatcher;
    }

    if (options.timeout > 0) {
        controller = new global.AbortController();
        fetchOptions.signal = controller.signal;
        timeout = setTimeout(function () {
            timedOut = true;
            controller.abort();
        }, options.timeout);

        if (options.signal) {
            externalAbortHandler = function () {
                controller.abort();
            };
            options.signal.addEventListener('abort', externalAbortHandler, { once: true });
        }
    } else if (options.signal) {
        fetchOptions.signal = options.signal;
    }

    global.fetch(url, fetchOptions)
        .then(function (response) {
            return readBody(response, options).then(function (responseBody) {
                return {
                    body: responseBody,
                    response: createResponse(response, responseBody)
                };
            });
        })
        .then(function (result) {
            cleanup();
            cb(null, result.response, result.body);
        }, function (error) {
            cleanup();
            if (timedOut) {
                var timeoutError = new Error('Request timed out after ' + options.timeout + 'ms');
                timeoutError.code = 'ETIMEDOUT';
                timeoutError.cause = error;
                error = timeoutError;
            }
            cb(error);
        });

    function cleanup() {
        if (timeout) {
            clearTimeout(timeout);
        }
        if (externalAbortHandler) {
            options.signal.removeEventListener('abort', externalAbortHandler);
        }
    }
}

function normalizeOptions(defaultOptions, requestOptions) {
    if (typeof requestOptions === 'string') {
        requestOptions = { url: requestOptions };
    }
    return mergeOptions(defaultOptions, requestOptions || {});
}

function mergeOptions(defaultOptions, requestOptions) {
    var result = {};
    var key;

    for (key in defaultOptions) {
        result[key] = defaultOptions[key];
    }
    for (key in requestOptions) {
        result[key] = requestOptions[key];
    }

    result.headers = {};
    copyHeaders(result.headers, defaultOptions.headers);
    copyHeaders(result.headers, requestOptions.headers);
    return result;
}

function copyHeaders(target, source) {
    if (!source) {
        return;
    }
    for (var name in source) {
        for (var existingName in target) {
            if (existingName.toLowerCase() === name.toLowerCase()) {
                delete target[existingName];
            }
        }
        target[name] = source[name];
    }
}

function createHeaders(options) {
    var headers = new global.Headers(options.headers || {});
    var auth = options.auth;

    if (auth && !headers.has('authorization')) {
        if (auth.bearer) {
            headers.set('authorization', 'Bearer ' + auth.bearer);
        } else {
            var username = auth.user || auth.username || '';
            var password = auth.pass || auth.password || '';
            headers.set('authorization', 'Basic ' + Buffer.from(username + ':' + password).toString('base64'));
        }
    }

    return headers;
}

function createBody(options, headers) {
    var body = options.body;

    if (options.form) {
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/x-www-form-urlencoded');
        }
        return toSearchParams(options.form).toString();
    }

    if (options.json && options.json !== true && body === undefined) {
        body = options.json;
    }
    if (options.json && body !== undefined && typeof body !== 'string' && !Buffer.isBuffer(body)) {
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/json');
        }
        return JSON.stringify(body);
    }
    return body;
}

function addQuery(value, query) {
    if (!value || !query) {
        return value;
    }

    var url = new URL(value);
    var params = toSearchParams(query);
    params.forEach(function (item, key) {
        url.searchParams.append(key, item);
    });
    return url.toString();
}

function toSearchParams(values) {
    var params = new URLSearchParams();

    for (var key in values) {
        var value = values[key];
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                params.append(key, value[i]);
            }
        } else if (value !== undefined && value !== null) {
            params.append(key, value);
        }
    }
    return params;
}

function readBody(response, options) {
    if (options.json) {
        return response.text().then(function (body) {
            if (!body) {
                return body;
            }
            try {
                return JSON.parse(body);
            } catch (error) {
                return body;
            }
        });
    }

    if (options.encoding === null) {
        return response.arrayBuffer().then(function (body) {
            return Buffer.from(body);
        });
    }

    return response.text();
}

function createResponse(response, body) {
    var headers = {};
    response.headers.forEach(function (value, name) {
        headers[name] = value;
    });
    return {
        body: body,
        headers: headers,
        status: response.status,
        statusCode: response.status,
        statusMessage: response.statusText,
        url: response.url
    };
}
