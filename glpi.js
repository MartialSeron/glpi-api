const got = require('got');
const { URL, URLSearchParams } = require('url');
const qs = require('qs');
const _ = require('lodash');

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

module.exports = class Glpi {
  constructor(settings = {}) {
    if (!settings.user_token &&
       (!settings.auth || (!settings.auth.username || !settings.auth.password))) {
      throw MissingAuthorizationError();
    }

    if (!settings.app_token) {
      throw MissingAppTokenError();
    }

    if (!settings.apiurl) {
      throw MissingAPIURLError();
    }

    this._settings = {
      user_token : settings.user_token,
      auth       : this._getAuth(settings.auth),
      app_token  : settings.app_token,
      apiurl     : settings.apiurl,
    };
    this._session = '';

    console.log(this._settings);
  }

  _getAuth(auth) {
    if (auth && auth.username) {
      const username = auth.username;
      const password = auth.password || '';
      const base64 = new Buffer(`${username}:${password}`).toString('base64');
      return base64;
    }
    return auth;
  }

  _getRequest(path) {
    const req = {
      url     : `${this._settings.apiurl}${path}`,
      json    : true,
      headers : {
        'App-Token'     : this._settings.app_token,
        'Session-Token' : this._session,
      }
    };

    return got.get(req.url, req)
    .then((res) => {
      return res.body;
    });
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

    console.log('query :', query);
    return query;
  }

  _isValidItemType(itemType) {
    // TODO:
    return true;
  }

  initSession() {
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

    return got.get(req.url, req)
    .then((res) => {
      this._session = res.body.session_token;
      return res.body;
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
      return res.body;
    });
  }

  getMyProfiles() {
    return this._getRequest('/getMyProfiles');
  }

  getActiveProfile() {
    return this._getRequest('/getActiveProfile');
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

    console.log('path :', path);

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

    console.log('path :', path);

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

    console.log('path :', path);

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

    console.log('path :', path);

    return this._getRequest(path);
  }

  listSearchOptions(itemType, opts) {
    let options = {
      raw : false,
    };

    Object.assign(options, opts);

    const query = this._queryString(options);
    let path = `/listSearchOptions/${itemType}${query}`;

    console.log('path :', path);

    return this._getRequest(path);
  }


}