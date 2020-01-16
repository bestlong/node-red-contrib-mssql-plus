# Dev notes

## Requirement `mocha`

```shell
npm install mocha --save-dev
```

or

```shell
npm install -g mocha
```

## Prepare and run

```shell
mkdir -p temp
git clone --depth 1 https://github.com/node-red/node-red.git ./temp/node-red

npm install
npm install ./temp/node-red --no-save
npm run test
```
