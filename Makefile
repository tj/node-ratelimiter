
test: ## Execute all tests using mocha
	@./node_modules/.bin/mocha \
		--compilers="js:babel-core/register" \
		--require should \
		--require babel-polyfill \
		--timeout 10s \
		--bail \
		./src/*.spec.js ./src/**/*.spec.js

build: ## Build the lib with babel
	@./node_modules/.bin/babel \
		--ignore *.spec.js \
		--out-dir lib/ \
		src/

.PHONY: test
