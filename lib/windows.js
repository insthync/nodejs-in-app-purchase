var verbose = require('./verbose');
var constants = require('../constants');
var xmlCrypto = require('xml-crypto');
var Parser = require('@xmldom/xmldom').DOMParser;
var request = require('./fetch');
var responseData = require('./responseData');
var url = 'https://lic.apps.microsoft.com/licensing/certificateserver/?cid=';
var signatureNamespace = 'http://www.w3.org/2000/09/xmldsig#';

var NAME = '<Windows>';

module.exports.readConfig = function (configIn) {
    if (!configIn) {
        // no required config
        return;
    }
    verbose.setup(configIn);
    // Apply any default settings to Request.
    if ('requestDefaults' in configIn) {
        request = request.defaults(configIn.requestDefaults);
    }
};

// receipt is an XML string... oh microsoft... why?
module.exports.validatePurchase = function (receipt, cb) {
    var certId;
    var options = {
        ignoreWhiteSpace: true,
        onError: function (level, error) {
            if (level !== 'warning') {
                throw new Error(error);
            }
        }
    };
    verbose.log(NAME, 'Validate:', receipt);
    try {
        var doc = new Parser(options).parseFromString(receipt, 'text/xml');
        certId = doc.firstChild.getAttribute('CertificateId');
    } catch (e) {
        verbose.log(NAME, 'Failed:', e);
        return cb(new Error('failed to validate purchase: ' + e.message), { status: constants.VALIDATION.FAILURE, message: e.message });
    }
    if (!certId) {
        verbose.log(NAME, 'Failed: Invalid certificate ID');
        return cb(new Error('failed to find certificate ID'), { status: constants.VALIDATION.FAILURE, message: 'Invalid certificate ID' });
    }
    verbose.log(NAME, 'Get public key from:', url + certId);
    send(url + certId, function (error, body) {
        if (error) {
            verbose.log(NAME, 'Failed to get public key:', (url + certId), error);
            return cb(error);
        }
        var data;
        try {
            var publicKey = toPem(body);
            var canonicalXML = removeWhiteSpace(doc.firstChild).toString();
            var signature = doc.getElementsByTagNameNS(signatureNamespace, 'Signature')[0];
            var sig = new xmlCrypto.SignedXml({
                publicCert: publicKey,
                getCertFromKeyInfo: function () {
                    return null;
                }
            });
            sig.loadSignature(signature);
            if (sig.checkSignature(canonicalXML)) {
                // create purchase data
                var items = doc.getElementsByTagName('ProductReceipt');
                var purchases = [];
                for (var i = 0, len = items.length; i < len; i++) {
                    var item = items[i];
                    purchases.push({
                        transactionId: item.getAttribute('Id'),
                        productId: item.getAttribute('ProductId'),
                        purchaseDate: item.getAttribute('PurchaseDate'),
                        expirationDate: item.getAttribute('ExpirationDate'),
                        productType: item.getAttribute('ProductType'),
                        appId: item.getAttribute('AppId')
                    });
                }
                // successful validation
                data = {
                    service: constants.SERVICES.WINDOWS,
                    status: constants.VALIDATION.SUCCESS,
                    purchases: purchases
                };
            }
        } catch (e) {
            verbose.log(NAME, 'Failed to validated:', e);
            return cb(new Error('failed to validate purchase: ' + e.message), { status: constants.VALIDATION.FAILURE, message: e.message });
        }
        // done
        verbose.log(NAME, 'Validation success:', data);
        cb(null, data);
    });
};

module.exports.getPurchaseData = function (purchase, options) {
    if (!purchase || !purchase.purchases || !purchase.purchases.length) {
        return null;
    }
    var data = [];
    for (var i = 0, len = purchase.purchases.length; i < len; i++) {
        var item = purchase.purchases[i];
        var exp = new Date(item.expirationDate).getTime();

        if (options && options.ignoreExpired && exp && Date.now() - exp >= 0) {
            // we are told to ignore expired item and it has been expired
            continue;
        }

        var parsed = responseData.parse(item);
        parsed.purchaseDate = new Date(item.purchaseDate).getTime();
        parsed.expirationDate = exp;
        parsed.quantity = 1;
        data.push(parsed);
    }
    return data;
};

function send(url, cb) {
    var options = {
        encoding: null,
        url: url
    };
    request.get(options, function (error, res, body) {
        if (error) {
            return cb(error, { status: res ? res.statusCode : constants.VALIDATION.FAILURE, message: body });
        }
        if (!body) {
            return cb(new Error('invalid response from the service'), { status: res.status, message: 'Unknown' });
        }
        if (res.statusCode >= 400) {
            return cb(new Error('certificate service returned status ' + res.statusCode), {
                status: res.statusCode,
                message: body.toString('utf8')
            });
        }
        cb(null, body);
    });
}

function toPem(certificate) {
    var text = certificate.toString('utf8').trim();
    if (text.indexOf('-----BEGIN CERTIFICATE-----') === 0) {
        return text;
    }

    var encoded = /^[A-Za-z0-9+/=\r\n]+$/.test(text) ? text.replace(/\s/g, '') : certificate.toString('base64');
    return '-----BEGIN CERTIFICATE-----\n' + encoded.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----';
}

function removeWhiteSpace(node) {
    var rootNode = node;
    while (node) {
        const nextSibling = node.nextSibling;
        if (!node.tagName && (node.nextSibling || node.previousSibling)) {
            node.parentNode.removeChild(node);
        }
        if (node.firstChild) {
          removeWhiteSpace(node.firstChild);
        }
        node = nextSibling;
    }
    return rootNode;
}
