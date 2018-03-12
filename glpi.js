const got = require('got');
const { URL } = require('url');
const qs = require('qs');
const _ = require('lodash');
const debug = require('debug');

const log = debug('glpi-api');

class MissingAuthorizationError extends Error {
  constructor(message, extra) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAuthorizationError';
    this.message = message || 'Missing Authorization header';
    if (extra) this.extra = extra;
  }
}

class MissingAppTokenError extends Error {
  constructor(message, extra) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAppTokenError';
    this.message = message || 'Missing App-Token header';
    if (extra) this.extra = extra;
  }
}

class MissingAPIURLError extends Error {
  constructor(message, extra) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'MissingAPIURLError';
    this.message = message || 'Missing API URL header';
    if (extra) this.extra = extra;
  }
}

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
      throw new MissingAuthorizationError();
    }

    if (!settings.app_token) {
      throw new MissingAppTokenError();
    }

    if (!settings.apiurl) {
      throw new MissingAPIURLError();
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
      const password = auth.password || '';
      const base64 = new Buffer(`${username}:${password}`).toString('base64');
      return base64;
    }
    return auth;
  }

  /**
   * Call a GET HTTP request and return response body
   * @param {string} path path of the request
   */
  _getRequest(path) {
    const req = {
      url     : `${this._settings.apiurl}${path}`,
      json    : true,
      headers : {
        'App-Token'     : this._settings.app_token,
        'Session-Token' : this._session,
      }
    };

    log('get req :',req);

    return got.get(req.url, req);
  }


  /**
   * Call a POST HTTP request
   * @param {string} path path of the request
   */
  _postRequest(path, body) {
    const req = {
      url     : `${this._settings.apiurl}${path}`,
      json    : true,
      headers : {
        'App-Token'     : this._settings.app_token,
        'Session-Token' : this._session,
      },
      body: (body ? Object.assign({}, body) : {}),
    };

    for (let k in req.body) {
      if (!req.body[k]) delete req.body[k];
    }

    log('post req :',req);

    return got.post(req.url, req);
  }

  _queryString(options) {
    let query = '';
    Object.keys(options).forEach((key) => {
      if (typeof options[key] === 'string') {
        options[key] = (options[key]) ? options[key] : '';
      } else if (typeof options[key] === 'boolean') {
        options[key] = (options[key]) ? 1 : 0;
      }
    });

    query = qs.stringify(options, { arrayFormat: 'indices',  addQueryPrefix: true });

    log('query :', query);
    return query;
  }

  _isValidItemType(itemType) {
    // TODO:
    return true;
  }

  initSession() {
    log('Calling initSession()');
    const req = {
      url     : `${this._settings.apiurl}/initSession`,
      json    : true,
      headers : {
        'App-Token' : this._settings.app_token,
      }
    };

    if (this._settings.user_token) {
      req.headers.Authorization = `user_token ${this._settings.user_token}`;
    } else {
      req.headers.Authorization = `Basic ${this._settings.auth}`;
    }

    log(req);

    return got.get(req.url, req)
    .then((res) => {
      log(res);
      this._session = res.body.session_token;
      return res;
    });
  }

  killSession() {
    const req = {
      url     : `${this._settings.apiurl}/killSession`,
      json    : true,
      headers : {
        'App-Token'     : this._settings.app_token,
        'Session-Token' : this._session,
      }
    };

    return got.get(req.url, req)
    .then((res) => {
      this._session = '';
      return res;
    });
  }

  getMyProfiles() {
    return this._getRequest('/getMyProfiles');
  }

  getActiveProfile() {
    return this._getRequest('/getActiveProfile');
  }

  /**
   * Change active profile to the profiles_id one.
   * See getMyProfiles endpoint for possible profiles.
   * @param {Object} opts
   * @param {string|integer} opts.profiles_id  (default 'all') ID of the new active profile.
   */
  changeActiveProfile(opts) {
    let options = {
      profiles_id : 'all',
    };

    Object.assign(options, opts);

    return this._postRequest('/changeActiveProfile', options);
  }

  getMyEntities() {
    return this._getRequest('/getMyEntities');
  }

  getActiveEntities() {
    return this._getRequest('/getActiveEntities');
  }

  getFullSession() {
    return this._getRequest('/getFullSession');
  }

  getItem(itemType, id, opts) {
    let options = {
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

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/${itemType}/${id}${query}`;

    log('path :', path);

    return this._getRequest(path);
  }

  getItems(itemType, opts) {
    let options = {
      expand_dropdowns  : false,
      get_hateoas       : true,
      only_id           : false,
      range             : '0-50',
      sort              : 'id',
      order             : 'DESC',
      searchText        : '',
      is_deleted        : false,
    };

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/${itemType}${query}`;

    log('path :', path);

    return this._getRequest(path);
  }

  getSubItems(itemType, id, subItemType, opts) {
    let options = {
      expand_dropdowns  : false,
      get_hateoas       : true,
      only_id           : false,
      range             : '0-50',
      sort              : 'id',
      order             : 'DESC',
    };
    let path = '';

    if (_.isPlainObject(itemType)) {
      opts = subItemType;
      subItemType = id;

      if (!_.isArray(itemType.links) || typeof subItemType !== 'string') {
        throw new Error(`No link found for ${subItemType}`);
      }

      if (!subItemType) {
        throw new Error('No subItemType specified');
      }

      const url = new URL(itemType.links.find((e) => e.rel === subItemType).href);

      path = url.href.replace(this._settings.apiurl, '');

    } else {
      path = `/${itemType}/${id}/${subItemType}`;
    }

    Object.assign(options, opts);

    path += this._queryString(options);

    log('path :', path);

    return this._getRequest(path);
  }

  getMultipleItems(opts) {
    let options = {
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

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/getMultipleItems${query}`;

    log('path :', path);

    return this._getRequest(path);
  }

  listSearchOptions(itemType, opts) {
    let options = {
      raw : false,
    };

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/listSearchOptions/${itemType}${query}`;

    log('path :', path);

    return this._getRequest(path);
  }

  search(itemType, opts) {
    let options = {
      criteria     : [],
      metacriteria : [],
      sort         : 'id',
      order        : 'DESC',
      range        : '0-50',
      forcedisplay : [],
      rawdata      : false,
      withindexes  : false,
      uid_cols     : false,
      giveItems    : false,
    };

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/search/${itemType}${query}`;

    log('path :', path);

    return this._getRequest(path);
  }
}

module.exports = Glpi;