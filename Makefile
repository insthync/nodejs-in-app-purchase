.PHONY: lint
lint:
	./lint

.PHONY: test
test:
	npm run test:unit
	#npx mocha test/facebook.js -R spec -b --timeout=5000 --appAccessToken=false --path=false

.PHONY: aptest
aptest:
	node --require ./test/node-test-shim.js --test test/apple.js

.PHONY: gotest
gotest:
	node --require ./test/node-test-shim.js --test test/google.js

.PHONY: amtest
amtest:
	node --require ./test/node-test-shim.js --test test/amazon.js

.PHONY: witest
witest:
	node --require ./test/node-test-shim.js --test test/windows.js

.PHONY: fatest
witest:
	node --require ./test/node-test-shim.js --test test/facebook.js

.PHONY: test-apple
test-apple:
	IAP_TEST_PATH=$(path) node --require ./test/node-test-shim.js --test test/apple.js

.PHONY: test-google
test-google:
	IAP_TEST_PATH=$(path) IAP_TEST_PK=$(pk) node --require ./test/node-test-shim.js --test test/google.js

.PHONY: test-windows
test-windows:
	IAP_TEST_PATH=$(path) node --require ./test/node-test-shim.js --test test/windows.js

.PHONY: test-amazon
test-amazon:
	IAP_TEST_SHARED_KEY=$(sharedKey) IAP_TEST_PATH=$(path) node --require ./test/node-test-shim.js --test test/amazon.js

.PHONY: test-facebook
test-facebook:
	IAP_TEST_APP_ACCESS_TOKEN=$(appAccessToken) IAP_TEST_PATH=$(path) node --require ./test/node-test-shim.js --test test/facebook.js
