'use strict';

var assert = require('assert');
var http = require('http');
var request = require('../lib/fetch');

describe('#### Fetch HTTP client ####', function () {
    var server;
    var baseUrl;

    before(function (done) {
        server = http.createServer(function (req, res) {
            var chunks = [];

            req.on('data', function (chunk) {
                chunks.push(chunk);
            });
            req.on('end', function () {
                if (req.url === '/slow') {
                    return setTimeout(function () {
                        res.end('late');
                    }, 100);
                }
                if (req.url === '/binary') {
                    res.end(Buffer.from([ 0, 255, 1, 254 ]));
                    return;
                }
                if (req.url === '/teapot') {
                    res.statusCode = 418;
                    res.end('short and stout');
                    return;
                }

                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({
                    body: Buffer.concat(chunks).toString(),
                    header: req.headers['x-client'],
                    method: req.method,
                    url: req.url
                }));
            });
        });
        server.listen(0, '127.0.0.1', function () {
            baseUrl = 'http://127.0.0.1:' + server.address().port;
            done();
        });
    });

    after(function (done) {
        server.close(done);
    });

    it('applies defaults and sends JSON bodies', function (done) {
        var client = request.defaults({ headers: { 'X-Client': 'old' } });
        client.post({
            url: baseUrl + '/echo',
            qs: { source: 'test' },
            body: { value: 42 },
            json: true,
            encoding: null,
            headers: { 'x-client': 'iap' }
        }, function (error, response, body) {
            assert.ifError(error);
            assert.equal(response.statusCode, 200);
            assert.equal(response.body, body);
            assert.equal(body.method, 'POST');
            assert.equal(body.header, 'iap');
            assert.equal(body.url, '/echo?source=test');
            assert.deepEqual(JSON.parse(body.body), { value: 42 });
            done();
        });
    });

    it('encodes form bodies', function (done) {
        request({
            method: 'POST',
            url: baseUrl + '/form',
            form: { grant_type: 'refresh_token', scope: 'one two' },
            json: true
        }, function (error, response, body) {
            assert.ifError(error);
            assert.equal(response.statusCode, 200);
            assert.equal(body.body, 'grant_type=refresh_token&scope=one+two');
            done();
        });
    });

    it('preserves HTTP status responses', function (done) {
        request.get(baseUrl + '/teapot', function (error, response, body) {
            assert.ifError(error);
            assert.equal(response.statusCode, 418);
            assert.equal(body, 'short and stout');
            done();
        });
    });

    it('returns a Buffer when encoding is null', function (done) {
        request.get({ url: baseUrl + '/binary', encoding: null }, function (error, response, body) {
            assert.ifError(error);
            assert.equal(response.statusCode, 200);
            assert.deepEqual(body, Buffer.from([ 0, 255, 1, 254 ]));
            done();
        });
    });

    it('reports timeouts with the request-compatible error code', function (done) {
        request.get({ url: baseUrl + '/slow', timeout: 10 }, function (error) {
            assert(error);
            assert.equal(error.code, 'ETIMEDOUT');
            done();
        });
    });
});
