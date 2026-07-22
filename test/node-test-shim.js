'use strict';

var test = require('node:test');
var path = require('path');

var testFile = path.basename(process.argv[1]);
var argumentsByFile = {
    'amazon.js': [
        [ 'sharedKey', process.env.IAP_TEST_SHARED_KEY ],
        [ 'path', process.env.IAP_TEST_PATH ]
    ],
    'apple.js': [ [ 'path', process.env.IAP_TEST_PATH ] ],
    'facebook.js': [
        [ 'appAccessToken', process.env.IAP_TEST_APP_ACCESS_TOKEN ],
        [ 'path', process.env.IAP_TEST_PATH ]
    ],
    'google.js': [
        [ 'api', process.env.IAP_TEST_API ],
        [ 'path', process.env.IAP_TEST_PATH ],
        [ 'pk', process.env.IAP_TEST_PK ]
    ],
    'windows.js': [ [ 'path', process.env.IAP_TEST_PATH ] ]
};

(argumentsByFile[testFile] || []).forEach(function (entry) {
    process.argv.push('--' + entry[0] + '=' + (entry[1] || 'false'));
});

global.describe = test.describe;
global.it = function (name, fn) {
    return test.it(name, wrapCallback(fn));
};
global.before = function (fn) {
    return test.before(wrapCallback(fn));
};
global.after = function (fn) {
    return test.after(wrapCallback(fn));
};

function wrapCallback(fn) {
    if (fn.length === 0) {
        return fn;
    }

    return function () {
        return new Promise(function (resolve, reject) {
            var completed = false;
            var done = function (error) {
                if (completed) {
                    return;
                }
                completed = true;
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };

            try {
                fn(done);
            } catch (error) {
                reject(error);
            }
        });
    };
}
