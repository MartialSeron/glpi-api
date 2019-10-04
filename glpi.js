const request = require('request-promise-native');
const { URL } = require('url');
const _ = require('lodash');
const debug = require('debug');
const path = require('path');
const fs = require('fs');

const ServerError = require('./errors/ServerError');
const InvalidItemTypeError = require('./errors/InvalidItemTypeError');
const InvalidParameterError = require('./errors/InvalidParameterError');
const MissingAuthorizationError = require('./errors/MissingAuthorizationError');
const MissingAppTokenError = require('./errors/MissingAppTokenError');
const MissingAPIURLError = require('./errors/MissingAPIURLError');
const MissingHATEOASError = require('./errors/MissingHATEOASError');
const MissingItemTypeError = require('./errors/MissingItemTypeError');
const InvalidAPIURLError = require('./errors/InvalidAPIURLError');
const InvalidHTTPMethodError = require('./errors/InvalidHTTPMethodError');
const FileNotReadableError = require('./errors/FileNotReadableError');

const log = debug('glpi-api');

const itemTypes = require('./itemTypes.json');

const HTTP_GET = 'get';
const HTTP_POST = 'post';
const HTTP_PUT = 'put';
const HTTP_DELETE = 'delete';

const userAgent = 'glpi-api/1.4.0';

/** Class to manage access to GLPI via REST API */
class Glpi {
  /**
   * Create a Glpi object
   *
   * Usage :
   *
   * ```
   * const Glpi = require('glpi-api');
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

    let apiurl;
    try {
      apiurl = new URL(settings.apiurl);
    } catch (errApiurl) {
      throw new InvalidAPIURLError(`Invalid API URL ${settings.apiurl}`);
    }

    this._settings = {
      user_token : settings.user_token,
      auth       : this._getAuth(settings.auth),
      app_token  : settings.app_token,
      port       : settings.port,
      apiurl,
    };
    this._session = '';

    log('> SETTINGS :', this._settings);
  }

  /**
   * Add one or more custom itemTypes to the valid itemTypes list
   *
   * @param {string|array} customItemTypes String or array of string of itemType to add to the valid itemTypes list
   * @memberof Glpi
   */
  addCustomItemTypes(customItemTypes) {
    if (!_.isArray(customItemTypes)) {
      customItemTypes = [customItemTypes];
    }
    customItemTypes.forEach((customItemType) => {
      itemTypes.push(customItemType);
    });
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
      const base64 = Buffer.from(`${username}:${password}`).toString('base64');
      return base64;
    }
    return auth;
  }

  _request(method, endpoint, options) {
    if (![HTTP_GET, HTTP_POST, HTTP_PUT, HTTP_DELETE].includes(method)) {
      throw new InvalidHTTPMethodError(`Invalid method: ${method}`);
    }
    log('options :', options);

    let req = {
      resolveWithFullResponse : true,
      json : true,
      baseUrl : this._settings.apiurl.href,
      url : endpoint,
      headers : {
        'User-Agent'    : userAgent,
        'Cache-Control' : 'no-cache',
        'App-Token'     : this._settings.app_token,
      },
      method,
    };

    if (this._session) {
      req.headers['Session-Token'] = this._session;
    }

    if (options) {
      req = { ...req, ...options, qs: options.query };
    }

    return request(req)
    .then((incomingMessage) => {
      const range = this._parseContentRange(incomingMessage.headers);
      let response = {
        code: incomingMessage.statusCode,
        data: incomingMessage.body,
        range,
      };
      return response;
    });
  }

  _validateItemType(itemType) {
    if (!itemType) {
      throw new MissingItemTypeError('Missing item type');
    }

    if (itemTypes.indexOf(itemType)===-1) {
      throw new InvalidItemTypeError('Invalid item type');
    }
    return true;
  }

  _parseContentRange(headers) {
    const pattern = /(\d+)-(\d+)\/(\d+)/;
    if (!headers || !headers['content-range'] || !pattern.test(headers['content-range'])) {
      return {};
    }
    const [ , min, max, total ] = pattern.exec(headers['content-range']);
    return {
      min   : parseInt(min, 10),
      max   : parseInt(max, 10),
      total : parseInt(total, 10),
    };
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
    .then((response) => {
      this._session = response.data.session_token;
      return response;
    })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  killSession() {
    log('Calling killSession()');
    return this._request(HTTP_GET, '/killSession')
    .then((response) => {
      this._session = '';
      return response;
    })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  lostPassword(email, password_forget_token, password) {
    log('Calling lostPassword()');
    const body = {
      email,
      password_forget_token,
      password,
    };
    return this._request(HTTP_PUT, '/lostPassword', { body })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  getMyProfiles() {
    return this._request(HTTP_GET, '/getMyProfiles')
    .then((response) => ({ code : response.code, data : response.data.myprofiles }))
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  getActiveProfile() {
    return this._request(HTTP_GET, '/getActiveProfile')
    .then((response) => ({ code : response.code, data : response.data.active_profile }))
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  /**
   * Change active profile to the profiles_id one.
   * See getMyProfiles endpoint for possible profiles.
   * @param {integer} profiles_id  ID of the new active profile.
   */
  changeActiveProfile(profiles_id) {
    const body = { profiles_id };
    return this._request(HTTP_POST, '/changeActiveProfile', { body })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  getMyEntities() {
    return this._request(HTTP_GET, '/getMyEntities')
    .then((response) => ({ code : response.code, data : response.data.myentities }))
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  getActiveEntities() {
    return this._request(HTTP_GET, '/getActiveEntities')
    .then((response) => ({ code : response.code, data : response.data.active_entity }))
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  /**
   * Change active profile to the profiles_id one.
   * See getMyProfiles endpoint for possible profiles.
   * @param {integer} profiles_id  ID of the new active profile.
   */
  changeActiveEntities(entities_id, is_recursive = 'false') {
    const body = { entities_id, is_recursive };
    return this._request(HTTP_POST, '/changeActiveEntities', { body })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  getFullSession() {
    return this._request(HTTP_GET, '/getFullSession')
    .then((response) => ({ code : response.code, data : response.data.session }))
    .catch((err) => {
      throw new ServerError(err);
    });
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

    return this._request(HTTP_GET, endpoint, { query })
    .catch((err) => {
      throw new ServerError(err);
    });
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

    return this._request(HTTP_GET, endpoint, { query })
    .catch((err) => {
      throw new ServerError(err);
    });
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

    return this._request(HTTP_GET, endpoint, { query })
    .catch((err) => {
      throw new ServerError(err);
    });
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
    return this._request(HTTP_GET, '/getMultipleItems', { query })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  listSearchOptions(itemType, raw = false) {
    this._validateItemType(itemType);

    const query = (raw) ? { raw : true } : undefined;
    const endpoint = `/listSearchOptions/${itemType}`;

    return this._request(HTTP_GET, endpoint, { query })
    .catch((err) => {
      throw new ServerError(err);
    });
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

    return this._request(HTTP_GET, endpoint, { query })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  addItems(itemType, input = {}) {
    this._validateItemType(itemType);

    if (!input || _.isEmpty(input)) {
      throw new InvalidParameterError('Invalid parameter');
    }

    const body = { input };

    return this._request(HTTP_POST, `/${itemType}`, { body })
    .catch((err) => {
      throw new ServerError(err);
    });
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

    return this._request(HTTP_PUT, endpoint, { body })
    .catch((err) => {
      throw new ServerError(err);
    });

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

    return this._request(HTTP_DELETE, endpoint, { body, query })
    .catch((err) => {
      throw new ServerError(err);
    });
  }

  /**
   * Upload a document to GLPI
   *
   * @param {string} filePath Absolute path to the file to upload
   * @param {string} description Description to add to document
   */
  upload(filePath, description = '') {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
      throw new FileNotReadableError();
    }

    const file = path.parse(filePath);
    const fileName = file.name + file.ext;

    const readStream  = fs.createReadStream(filePath);
    const uploadManifest = JSON.stringify({
      input : {
        name : description,
        _filename: [fileName],
      },
    });

    const formData = {
      uploadManifest,
      'filename[0]' : {
        value : readStream,
        options : {
          filename : filePath,
          contentType : null,
        }
      },
    };

    log('> formData :', formData);

    return this._request(HTTP_POST, '/Document', { formData })
    .catch((err) => {
      throw new ServerError(err);
    });
  }
}

module.exports = Glpi;
