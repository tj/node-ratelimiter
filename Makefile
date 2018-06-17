
test:
	@./node_modules/.bin/mocha \
		--require should \
		--reporter dot \
		--timeout 10s \
		--bail \
		--exit

.PHONY: test
