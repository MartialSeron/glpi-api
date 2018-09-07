const got = require('got');
const { URL } = require('url');
const qs = require('qs');
const _ = require('lodash');
const debug = require('debug');

const log = debug('glpi-api');

class MissingAuthorizationError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAuthorizationError';
    this.message = message;
  }
}

class MissingAppTokenError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAppTokenError';
    this.message = message;
  }
}

class MissingAPIURLError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAPIURLError';
    this.message = message;
  }
}

class MissingHATEOASError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingHATEOASError';
    this.message = message;
  }
}

class MissingItemTypeError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingItemTypeError';
    this.message = message;
  }
}

class InvalidItemTypeError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'InvalidItemTypeError';
    this.message = message;
  }
}

class InvalidParameterError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'InvalidParameterError';
    this.message = message;
  }
}

const HTTP_GET = 'get';
const HTTP_POST = 'post';
const HTTP_PUT = 'put';
const HTTP_DELETE = 'delete';

/** Class to manage access to GLPI via REST API */
class Glpi {
  /**
   * Create a Glpi object
   *
   * Usage :
   *
   * ```
   * const Glpi = require('./glpi');
   * const glpi = new Glpi({
   *   apiurl     : 'http://glpi.myserver.com/apirest.php',
   *   user_token : 'q56hqkniwot8wntb3z1qarka5atf365taaa2uyjrn',
   *   app_token  : 'f7g3csp8mgatg5ebc5elnazakw20i9fyev1qopya7',
   * });
   *
   * // or
   *
   * const glpi = new Glpi({
   *   apiurl     : 'http://glpi.myserver.com/apirest.php',
   *   app_token  : 'f7g3csp8mgatg5ebc5elnazakw20i9fyev1qopya7',
   *   auth       : {
   *     username : 'glpi',
   *     password : 'glpi',
   *   }
   * });
   * ```
   *
   * @param {Object} settings
   * @param {Object} settings.user_token Token used for user token authentication
   * @param {Object} settings.auth 2 parameters to login with user authentication
   * @param {Object} settings.auth.username username parameter used for user authentication
   * @param {Object} settings.auth.password password parameter used for user authentication
   * @param {Object} settings.app_token Authorization string provided by the GLPI api configuration
   * @param {Object} settings.apiurl URL of the apirest.php file
   */
  constructor(settings = {}) {
    if (!settings.user_token &&
       (!settings.auth || (!settings.auth.username || !settings.auth.password))) {
      throw new MissingAuthorizationError('Missing Authorization header');
    }

    if (!settings.app_token) {
      throw new MissingAppTokenError('Missing App-Token header');
    }

    if (!settings.apiurl) {
      throw new MissingAPIURLError('Missing API URL header');
    }

    this._settings = {
      user_token : settings.user_token,
      auth       : this._getAuth(settings.auth),
      app_token  : settings.app_token,
      apiurl     : settings.apiurl,
    };
    this._session = '';

    log(this._settings);
  }

  /**
   * Return the appropriate string for authentication
   * @param {Object} settings.auth 2 parameters to login with user authentication
   * @param {Object} settings.auth.username username parameter used for user authentication
   * @param {Object} settings.auth.password password parameter used for user authentication
   */
  _getAuth(auth) {
    if (auth && auth.username) {
      const username = auth.username;
      const password = auth.password;
      const base64 = new Buffer(`${username}:${password}`).toString('base64');
      return base64;
    }
    return auth;
  }

  /**
   * Call a GET HTTP request and return response body
   * @param {string} path path of the request
   */
  _request(method, endpoint, options) {
    const req = {
      baseUrl : this._settings.apiurl,
      json    : true,
      headers : {
        'App-Token'     : this._settings.app_token,
        'Session-Token' : this._session,
      },
      method,
      port: 80,
      protocol: 'http:',
    };

    if (options && options.body) {
      req.body = Object.assign({}, options.body);
      for (let k in req.body) {
        if (!req.body[k]) delete req.body[k];
      }
    }

    if (options && options.query) {
      req.query = qs.stringify(options.query, { arrayFormat: 'indices',  addQueryPrefix: false });
    }

    if (options && options.headers) {
      req.headers = Object.assign({}, req.headers, options.headers) ;
    }

    log('> METHOD :',method);
    log('> ENDPOINT :',endpoint);
    log('> REQUEST :',req);

    return got(`${this._settings.apiurl}${endpoint}`, req)
    .then((res) => {
      // log('> RESPONSE :', res);
      return res;
    });

  }

  // _queryString(options) {
  //   let query = '';
  //   Object.keys(options).forEach((key) => {
  //     if (typeof options[key] === 'string') {
  //       options[key] = (options[key]) ? options[key] : '';
  //     } else if (typeof options[key] === 'boolean') {
  //       options[key] = (options[key]) ? 1 : 0;
  //     }
  //   });

  //   query = qs.stringify(options, { arrayFormat: 'indices',  addQueryPrefix: true });

  //   log('query :', query);
  //   return query;
  // }

  _validateItemType(itemType) {
    const itemTypes = require('./itemTypes.json');
    if (!itemType) {
      throw new MissingItemTypeError('Missing item type');
    }

    if (itemTypes.indexOf(itemType)===-1) {
      throw new InvalidItemTypeError('Invalid item type');
    }
    return true;
  }

  initSession() {
    log('Calling initSession()');
    const headers = {
      'App-Token' : this._settings.app_token,
    };
    if (this._settings.user_token) {
      headers.Authorization = `user_token ${this._settings.user_token}`;
    } else {
      headers.Authorization = `Basic ${this._settings.auth}`;
    }
    return this._request(HTTP_GET, '/initSession', { headers })
    .then((res) => {
      this._session = res.body.session_token;
      return res;
    });
  }

  killSession() {
    log('Calling killSession()');
    return this._request(HTTP_GET, '/killSession')
    .then((res) => {
      this._session = '';
      return res;
    });
  }

  lostPassword(email, password_forget_token, password) {
    log('Calling lostPassword()');
    const body = {
      email,
      password_forget_token,
      password,
    };
    return this._request(HTTP_PUT, '/lostPassword', { body });
  }

  getMyProfiles() {
    return this._request(HTTP_GET, '/getMyProfiles');
  }

  getActiveProfile() {
    return this._request(HTTP_GET, '/getActiveProfile');
  }

  /**
   * Change active profile to the profiles_id one.
   * See getMyProfiles endpoint for possible profiles.
   * @param {integer} profiles_id  ID of the new active profile.
   */
  changeActiveProfile(profiles_id) {
    const body = { profiles_id };
    return this._request(HTTP_POST, '/changeActiveProfile', { body });
  }

  getMyEntities() {
    return this._request(HTTP_GET, '/getMyEntities');
  }

  getActiveEntities() {
    return this._request(HTTP_GET, '/getActiveEntities');
  }

  /**
   * Change active profile to the profiles_id one.
   * See getMyProfiles endpoint for possible profiles.
   * @param {integer} profiles_id  ID of the new active profile.
   */
  changeActiveEntities(entities_id, is_recursive = 'false') {
    const body = { entities_id, is_recursive };
    return this._request(HTTP_POST, '/changeActiveEntities', { body });
  }

  getFullSession() {
    return this._request(HTTP_GET, '/getFullSession');
  }

  getItem(itemType, id, opts = {}) {
    this._validateItemType(itemType);

    const options = {
      expand_dropdowns  : false,
      get_hateoas       : true,
      get_sha1          : false,
      with_devices      : false,
      with_disks        : false,
      with_softwares    : false,
      with_connections  : false,
      with_networkports : false,
      with_infocoms     : false,
      with_contracts    : false,
      with_documents    : false,
      with_tickets      : false,
      with_problems     : false,
      with_changes      : false,
      with_notes        : false,
      with_logs         : false,
    };

    const query = Object.assign({}, options, opts);
    const endpoint = `/${itemType}/${id}`;

    return this._request(HTTP_GET, endpoint, { query });
  }

  getItems(itemType, opts = {}) {
    this._validateItemType(itemType);

    const options = {
      expand_dropdowns  : false,
      get_hateoas       : true,
      only_id           : false,
      range             : '0-50',
      sort              : 'id',
      order             : 'DESC',
      searchText        : '',
      is_deleted        : false,
    };

    const query = Object.assign({}, options, opts);
    const endpoint = `/${itemType}`;

    return this._request(HTTP_GET, endpoint, { query });
  }

  getSubItems(itemType, id, subItemType, opts = {}) {

    const options = {
      expand_dropdowns  : false,
      get_hateoas       : true,
      only_id           : false,
      range             : '0-50',
      sort              : 'id',
      order             : 'DESC',
    };

    let endpoint;

    if (_.isPlainObject(itemType)) {
      const item = itemType;
      opts = subItemType;
      subItemType = id;

      if (!item.links || !_.isArray(item.links)) {
        throw new MissingHATEOASError('Missing HATEOAS on provided object');
      }
      this._validateItemType(subItemType);

      const link = item.links.find((e) => e.rel === subItemType);

      if (!link) {
        throw new MissingHATEOASError(`Missing link for '${subItemType}' on provided object`);
      }

      const url = new URL(link.href);

      endpoint = url.href.replace(this._settings.apiurl, '');
      if (endpoint[endpoint.length - 1] === '/') {
        endpoint = endpoint.slice(0, -1);
      }

    }
    else {
      this._validateItemType(itemType);
      this._validateItemType(subItemType);

      endpoint = `/${itemType}/${id}/${subItemType}`;
    }

    const query = Object.assign({}, options, opts);

    return this._request(HTTP_GET, endpoint, { query });
  }

  getMultipleItems(opts = {}) {
    const options = {
      items             : [],
      expand_dropdowns  : false,
      get_hateoas       : true,
      get_sha1          : false,
      with_devices      : false,
      with_disks        : false,
      with_softwares    : false,
      with_connections  : false,
      with_networkports : false,
      with_infocoms     : false,
      with_contracts    : false,
      with_documents    : false,
      with_tickets      : false,
      with_problems     : false,
      with_changes      : false,
      with_notes        : false,
      with_logs         : false,
    };

    const query = Object.assign({}, options, opts);

    if(opts.items) {
      query.items = JSON.parse(JSON.stringify(opts.items));
    } else {
      throw new InvalidParameterError('Invalid parameter');
    }
    return this._request(HTTP_GET, '/getMultipleItems', { query });
  }

  listSearchOptions(itemType, raw = false) {
    this._validateItemType(itemType);

    const query = (raw) ? { raw : true } : undefined;
    const endpoint = `/listSearchOptions/${itemType}`;

    return this._request(HTTP_GET, endpoint, { query });
  }

  search(itemType, opts = {}) {
    this._validateItemType(itemType);

    const options = {
      criteria     : [],
      metacriteria : [],
      sort         : 'id',
      order        : 'DESC',
      // range        : '0-50',
      forcedisplay : [],
      rawdata      : false,
      withindexes  : false,
      uid_cols     : false,
      giveItems    : false,
    };

    const query = Object.assign({}, options, opts);
    const endpoint = `/search/${itemType}`;

    return this._request(HTTP_GET, endpoint, { query });
  }

  addItems(itemType, input = {}) {
    this._validateItemType(itemType);

    if (!input || _.isEmpty(input)) {
      throw new InvalidParameterError('Invalid parameter');
    }

    const body = { input };

    return this._request(HTTP_POST, `/${itemType}`, { body });
  }

  updateItems(itemType, id, input = {}) {
    this._validateItemType(itemType);
    if ((!input || _.isEmpty(input)) && (_.isPlainObject(id) || _.isArray(id))) {
      input = id;
      id = undefined;
    }

    if (!input || _.isEmpty(input) || (!id && !input.id && !input.length) || (id && input.length)) {
      throw new InvalidParameterError('Invalid parameter');
    }

    if (input.length) {
      const invalidArray = input.some(item => !item.id);
      if (invalidArray) {
        throw new InvalidParameterError('Invalid parameter');
      }
    }

    let endpoint = `/${itemType}`;
    if (id) {
      endpoint += `/${id}`;
    }

    const body = { input };

    return this._request(HTTP_PUT, endpoint, { body });

  }

  deleteItems(itemType, id, input = {}, opts = {}) {
    this._validateItemType(itemType);
    if (_.isPlainObject(id) || _.isArray(id)) {
      opts = input;
      input = id;
      id = undefined;
    }

    if ((!id && !input.id && !input.length) || (id && input.length)) {
      throw new InvalidParameterError('Invalid parameter');
    }

    if (input.length) {
      const invalidArray = input.some(item => !item.id);
      if (invalidArray) {
        throw new InvalidParameterError('Invalid parameter');
      }
    }

    const options = {
      force_purge : false,
      history     : true,
    };

    const query = Object.assign({}, options, opts);
    const body = { input };

    let endpoint = `/${itemType}`;
    if (id) endpoint += `/${id}`;

    return this._request(HTTP_DELETE, endpoint, { body, query });
  }
}

module.exports = Glpi;