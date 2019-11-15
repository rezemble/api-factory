const querystring = require('querystring');

const patch = (url, path) => {
  let index = Math.min(...['?','#'].map(c => url.indexOf(c)).filter(i => i >= 0));
  return `${url.slice(0,index)}/${path}${url.slice(index)}`;
};
const patchQuery = (url, query={}) => {
  let h = url.indexOf('#');
  h = h < 0 ? url.length : h;
  let q = url.indexOf('?');
  q = q < 0 ? h : q;
  return `${url.slice(0,q)}?${querystring.stringify(query)}${url.slice(h)}`;
};

const APIFactory = (fn) => {
  class ApiOptions {
    constructor({ chains = [] }) {
      this.chains = chains || []
    }
    setOption(name, value) {
      return new ApiOptions({
        [name]: value,
      })
    }
    chain(...f) {
      return this.setOption('chains', [
        ...this.chains,
        ...f,
      ])
    }
  }
  const API = (...options) => new Proxy((...d) => fn(...d), {
    options: new ApiOptions({}),
    setOptions(options) {
      this.options = options
    },
    run(target, ...options) {
      let last = target(...options)
      for (const fn of this.options.chains) {
        last = last.then(fn)
      }
      return last;
    },
    ownKeys(target) {
      return ['__url', '__method', '__headers', 'prototype'];
    },
    getOwnPropertyDescriptor(target, p) {
      switch(p) {
        case '__url':
        case '__method':
        case '__headers':
          return {
            get: this.get.bind(this, target, p),
            enumerable: true,
            configurable: true,
          };
        default:
          return Reflect.getOwnPropertyDescriptor(target, p);
      }
    },
    get(target, p) {
      switch(p) {
        case 'then':
          return (...d) => this.run(target, ...options).then(...d);
        case 'finally':
          return (...d) => this.run(target, ...options).finally(...d);
        case 'catch':
          return (...d) => this.run(target, ...options).catch(...d);
        case '_rp_promise':
          return this.run(target, ...options);
        case Symbol.toStringTag:
          return `${options.method||'GET'}: ${options.uri}`;
        case Symbol.iterator:
          return null;
        case '__url':
          {
            let option = options.find(option => typeof option === 'string');
            if (option) return option;
            option = options.find(option => typeof option === 'object');
            return option.url || option.uri || null;
          }
        case '__method':
          {
            let option = options.find(option => typeof option === 'object');
            return (option||{}).method || 'GET';
          }
        case '__headers':
          {
            let option = options.find(option => typeof option === 'object');
            return (option||{}).headers || null; 
          }
        case '_POST':
        case '_GET':
        case '_PUT':
        case '_DELETE':
        case '_OPTIONS':
        case '_TRACE':
          {
            const api = API(...options.map(option => {
              switch(typeof option) {
                case 'object':
                  return {
                    ...option,
                    method: p.slice(1),
                  };
                default:
                  return option;
              }
            }));
            api._API_OPTIONS(this.options);
            return api;
          }
        case '_API_OPTIONS':
          return this.setOptions.bind(this);
        case '_CHAIN':
          return (...fn) => {
            const api = API(...options);
            api._API_OPTIONS(this.options.chain(...fn));
            return api;
          }
        case '_METHOD':
          return (method='GET') => {
            const api = API(...options.map(option => {
              switch(typeof option) {
                case 'object':
                  return {
                    ...option,
                    method,
                  };
                default:
                  return option;
              }
            }));
            api._API_OPTIONS(this.options);
            return api;
          }
        case '_HEADERS':
          return (headers, extend=true) => {
            const api = API(...options.map(option => {
              switch(typeof option) {
                case 'object':
                  return {
                    ...option,
                    headers: {
                      ...(extend?option.headers||{}:{}),
                      ...(headers||{}),
                    },
                  };
                default:
                  return option;
              }
            }));
            api._API_OPTIONS(this.options);
            return api;
          }
        case '_QUERY':
          return (query) => {
            const api = API(...options.some(option => typeof option === 'string')
              ? options.map(option => typeof option === 'string' ? patchQuery(option, query) : option)
              : options.map(option => typeof option === 'object' ? {
                ...option,
                [typeof option.uri !== 'undefined' ? 'uri' : 'url']: patchQuery(option.url||option.uri||'', query),
              } : option));
            api._API_OPTIONS(this.options);
            return api;
          }
        default:
          {
            const api = API(...options.some(option => typeof option === 'string')
              ? options.map(option => typeof option === 'string' ? patch(option||'', p) : option)
              : options.map(option => typeof option === 'object' ? {
                ...option,
                [typeof option.uri !== 'undefined' ? 'uri' : 'url']: patch(option.url||option.uri||'', p),
              } : option));
            api._API_OPTIONS(this.options);
            return api;
          }
      }
    },
    apply(target, that, args) {
      const api = API(...options.map(option => {
        let arg = args.find(arg => typeof arg === typeof option);
        if (arg && typeof option === 'object') {
          return {
            ...option,
            ...arg,
          };
        }
        return arg || option;
      }));
      api._API_OPTIONS(this.options);
      return api;
    },
  });
  return API;
}
  
module.exports = APIFactory;
