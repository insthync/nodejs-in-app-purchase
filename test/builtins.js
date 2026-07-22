'use strict';

var assert = require('assert');
var crypto = require('crypto');
var URLSearchParams = require('url').URLSearchParams;
var constants = require('../constants');
var facebook = require('../lib/facebook');
var googleApi = require('../lib/googleAPI');

describe('#### Built-in dependency replacements ####', function () {
    it('validates Facebook purchases without the abandoned Facebook SDK', function (done) {
        var originalFetch = global.fetch;
        var secret = 'test-secret';
        var purchase = {
            algorithm: 'HMAC-SHA256',
            amount: '1.99',
            currency: 'USD',
            payment_id: 'payment-123',
            product_id: 'product-123',
            purchase_time: 123456789,
            quantity: '1',
            status: 'completed'
        };
        var encodedPurchase = Buffer.from(JSON.stringify(purchase)).toString('base64url');
        var signature = crypto.createHmac('sha256', secret).update(encodedPurchase).digest('base64url');
        var requestedUrl;

        global.fetch = function (url) {
            requestedUrl = url;
            return Promise.resolve(jsonResponse({
                actions: [ { amount: '1.99', currency: 'USD', status: 'completed', type: 'charge' } ],
                items: [ { quantity: 1 } ]
            }));
        };

        facebook.readConfig({ facebookAppId: 'app-123', facebookAppSecret: secret });
        facebook.validatePurchase(null, signature + '.' + encodedPurchase, function (error, response) {
            global.fetch = originalFetch;
            try {
                assert.ifError(error);
                assert.equal(response.status, constants.VALIDATION.SUCCESS);
                assert.equal(response.service, constants.SERVICES.FACEBOOK);
                assert(requestedUrl.indexOf('/v3.3/payment-123?') !== -1);
                assert(requestedUrl.indexOf('access_token=app-123%7Ctest-secret') !== -1);
                done();
            } catch (assertionError) {
                done(assertionError);
            }
        });
    });

    it('signs Google service-account JWTs with Node crypto', function (done) {
        var originalFetch = global.fetch;
        var keys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            publicKeyEncoding: { type: 'spki', format: 'pem' }
        });
        var calls = [];

        global.fetch = function (url, options) {
            calls.push({ options: options, url: url });
            if (url.indexOf('accounts.google.com') !== -1) {
                return Promise.resolve(jsonResponse({ access_token: 'access-123' }));
            }
            return Promise.resolve(jsonResponse({ purchaseState: 0 }));
        };

        googleApi.config({ clientEmail: 'iap@example.com', privateKey: keys.privateKey });
        googleApi.validatePurchase(null, {
            packageName: 'com.example.app',
            productId: 'product-123',
            purchaseToken: 'purchase-123',
            subscription: false
        }, function (error, response) {
            global.fetch = originalFetch;
            try {
                assert.ifError(error);
                assert.equal(response.status, constants.VALIDATION.SUCCESS);
                assert.equal(response.service, constants.SERVICES.GOOGLE);
                assert.equal(calls.length, 2);

                var params = new URLSearchParams(calls[0].options.body);
                var token = params.get('assertion');
                var segments = token.split('.');
                var payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString());
                assert.equal(payload.iss, 'iap@example.com');
                assert(crypto.verify(
                    'RSA-SHA256',
                    Buffer.from(segments[0] + '.' + segments[1]),
                    keys.publicKey,
                    Buffer.from(segments[2], 'base64url')
                ));
                assert(calls[1].url.indexOf('access_token=access-123') !== -1);
                done();
            } catch (assertionError) {
                done(assertionError);
            }
        });
    });
});

function jsonResponse(body) {
    return new global.Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
        status: 200
    });
}
