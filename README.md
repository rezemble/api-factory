# api-factory
## quickly prototype a reusable API consumer using Javascript

### Installation
```
npm i @rezemble/api-factory
```

### Usage
```javascript
const APIFactory = require('api-factory')
```
APIFactory takes a function that returns a promise as an argument, such as `fetch` and returns a wrapped Proxy Function.

#### In Node
```javascript
const request = require('request-promise-native')

const API = APIFactory(request)

// the arguments passed to API are how you would usually use the function you supplied to the factory
const exampleAPI = API({
    uri: 'https://example.com',
    headers: {
        'Authorization': `Bearer ${token}`,
    },
    json: true,
})

exampleAPI.__url // https://example.com

// you can now traverse the API as such:
let foo = 'foo'
const subPath = exampleAPI[foo].bar

subPath.__url // https://example.com/foo/bar

// every 'modification' returns a new object extending the properties of the parent
exampleAPI.__url // https://example.com

// methods can be changed
exampleAPI.__method // GET
exampleAPI._POST.__method // POST
exampleAPI._METHOD('POST').__method // POST

// to run requests, use the API instance like you would a promise:
exampleAPI.then(res => /* doSomething */).catch(...)
await exampleAPI // result of request
subPath.then(res => /* doSomething */).catch(...)
await subPath // result of request to https://example.com/foo/bar
subPath._POST.then(res => /* doSomething */).catch(...)
await subPath._POST // result of POST request to subPath

// because every API instance is a function, calling this function will further augment its parameters.
// this would POST a body to https://example.com/foo/bar:
await subPath._POST({
    json: {
        foo: 'bar',
    },
})
```

#### In Browser

```javascript
const API = APIFactory(fetch)

const exampleAPI = API('https://example.com', { // pass parameters as you would to fetch
    headers: {
        'Authorization': `Bearer ${token}`,
    },
})

// the following sets up a POST end point to https://example.com/some/sub/path
// with added Content-Type header
const postEndpoint = exampleAPI.some.sub.path._POST._HEADERS({
    'Content-Type': 'application/json',
})

// to POST json data with fetch
await postEndpoint({
    body: JSON.stringify({
        foo: 'bar',
    })
}).then(d => d.json()) // parse JSON as you would with fetch
```

Every time you read `.then` on an API instance, the request is sent, so you can predefine references to specific endpoints and call them repeatedly.
