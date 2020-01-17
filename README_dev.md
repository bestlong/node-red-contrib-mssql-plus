# Dev notes

## Requirement

### np

```shell
npm install -g np
```

## Prepare and run test

```shell
mkdir -p temp
git clone --depth 1 https://github.com/node-red/node-red.git ./temp/node-red

npm install
npm install ./temp/node-red --no-save
npm test
```

## Release

```shell
npm run release
```
