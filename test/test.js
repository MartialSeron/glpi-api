const expect = require('chai').expect;
const nock = require('nock');
const Glpi = require('../glpi');

const myProfiles = require('./myprofiles.json');
const activeProfile = require('./activeprofile.json');
const myEntities = require('./myentities.json');
const activeEntity = require('./activeentity.json');
const fullSession = require('./fullsession.json');

const genToken = () => Math.random().toString(36).substr(2);

const config = {
  userToken : {
    app_token  : 'azertyuiop',
    apiurl     : 'http://usertoken.glpiapi.test/apirest.php',
    user_token : 'qsdfghjklm',
  },
  basicAuth : {
    app_token : 'azertyuiop',
    apiurl     : 'http://basicauth.glpiapi.test/apirest.php',
    auth      : {
      username : 'glpi',
      password : 'glpi',
    },
  },
};

describe('contructor()', () => {
  it('should create a Glpi object with user_token Authorisation method', () => {
    const glpi = new Glpi(config.userToken);
    expect(glpi).to.be.instanceOf(Glpi);
    expect(glpi).to.have.deep.own.property('_settings', {
      user_token : config.userToken.user_token,
      auth       : undefined,
      app_token  : config.userToken.app_token,
      apiurl     : config.userToken.apiurl,
    });
  });

  it('should create a Glpi object with Basic Authorisation method', () => {
    const glpi = new Glpi(config.basicAuth);
    const base64 = new Buffer(`${config.basicAuth.auth.username}:${config.basicAuth.auth.password}`).toString('base64');
    expect(glpi).to.be.instanceOf(Glpi);
    expect(glpi).to.have.deep.own.property('_settings', {
      auth       : base64,
      app_token  : config.basicAuth.app_token,
      apiurl     : config.basicAuth.apiurl,
      user_token : undefined,
    });
  });
});

describe('initSession()', () => {
  describe('Token Authorisation method', () => {

    afterEach(() => {
      nock.cleanAll();
    });

    it('should connect successfully', (done) => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('authorization', `user_token ${config.userToken.user_token}`)
      .get('/initSession')
      .reply(200, { session_token : genToken() });

      const glpi = new Glpi(config.userToken);
      glpi.initSession()
      .then((result) => {
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body');
        expect(result.body).to.have.property('session_token');
      })
      .then(done);
    });

    it('wrong app_token should not connect successfully', (done) => {

      const fakeConfig = Object.assign({}, config.userToken);
      fakeConfig.app_token = 'boggus';

      nock(fakeConfig.apiurl)
      .matchHeader('app-token', fakeConfig.app_token)
      .matchHeader('authorization', `user_token ${fakeConfig.user_token}`)
      .get('/initSession')
      .reply(400, [
        'ERROR_APP_TOKEN_PARAMETERS_MISSING',
        `missing parameter app_token; view documentation in your browser at ${fakeConfig.apiurl}/#ERROR_APP_TOKEN_PARAMETERS_MISSING`
      ], { statusMessage : 'Bad Request'});

      const glpi = new Glpi(fakeConfig);
      glpi.initSession()
      .then((result) => {
        expect(result).to.not.exist();
      })
      .catch((err) => {
        expect(err).to.have.property('statusCode', 400);
        expect(err).to.have.property('statusMessage', 'Bad Request');
      })
      .then(done);
    });
  });

  describe('Basic Authorisation method', () => {
    afterEach(() => {
      nock.cleanAll();
    });
    it('should connect successfully', (done) => {
      const base64 = new Buffer(`${config.basicAuth.auth.username}:${config.basicAuth.auth.password}`).toString('base64');
      nock(config.basicAuth.apiurl)
      .matchHeader('app-token', config.basicAuth.app_token)
      .matchHeader('authorization', `Basic ${base64}`)
      .get('/initSession')
      .reply(200, { session_token : genToken() });

      const glpi = new Glpi(config.basicAuth);
      glpi.initSession()
      .then((result) => {
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body');
        expect(result.body).to.have.property('session_token');
      })
      .catch((err) => {
        expect(err).to.not.exist();
      })
      .then(done);
    });

    it('wrong password should not connect successfully', (done) => {
      const fakeConfig = Object.assign({}, config.basicAuth);
      fakeConfig.auth.password = 'boggus';

      const base64 = new Buffer(`${fakeConfig.auth.username}:${fakeConfig.auth.password}`).toString('base64');
      nock(fakeConfig.apiurl)
      .matchHeader('app-token', fakeConfig.app_token)
      .matchHeader('authorization', `Basic ${base64}`)
      .get('/initSession')
      .reply(401, {}, { statusMessage : 'Unauthorized' });

      const glpi = new Glpi(fakeConfig);
      glpi.initSession()
      .then((result) => {
        expect(result).to.not.exist();
      })
      .catch((err) => {
        expect(err).to.have.property('statusCode', 401);
        expect(err).to.have.property('statusMessage', 'Unauthorized');
      })
      .then(done);
    });
  });
});

describe('Authenticated GET methods', () => {
  const glpi = new Glpi(config.userToken);
  let sessionToken = genToken();
  beforeEach(() => {
    nock(config.userToken.apiurl)
    .matchHeader('app-token', config.userToken.app_token)
    .matchHeader('authorization', `user_token ${config.userToken.user_token}`)
    .get('/initSession')
    .reply(200, { session_token : sessionToken });

    return glpi.initSession()
    .then(() => nock.cleanAll());
  });

  afterEach(() => {
    nock.cleanAll();
    sessionToken = genToken();
  });

  describe('killSession()', () => {
    it('should log out successfully', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/killSession')
      .reply(200, {});

      const result = await glpi.killSession();
      expect(result).to.have.property('statusCode', 200);
      expect(glpi._session).to.be.equal('');
    });
  });

  describe('getMyProfiles()', () => {
    it('should fetch my profiles', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getMyProfiles')
      .reply(200, myProfiles);

      const result = await glpi.getMyProfiles()
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.myprofiles');
      expect(result.body.myprofiles).to.be.an('array');
      const profile = result.body.myprofiles.find(p => p.name === 'Super-Admin');
      expect(profile).to.be.an('object');
      expect(profile).to.have.property('id', 4);
    });
  });

  describe('getActiveProfile()', () => {
    it('should return my active profile', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getActiveProfile')
      .reply(200, activeProfile);

      const result = await glpi.getActiveProfile();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.active_profile.id', 4);
    });
  });

  describe('getMyEntities()', () => {
    it('should return my entities', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getMyEntities')
      .reply(200, myEntities);

      const result = await glpi.getMyEntities();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.myentities[0].id', 0);
      expect(result).to.have.nested.property('body.myentities[0].name', 'Entité racine');
    });
  });

  describe('getActiveEntities()', () => {
    it('should return current active entities', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getActiveEntities')
      .reply(200, activeEntity);

      const result = await glpi.getActiveEntities();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.active_entity.id', 0);
      expect(result).to.have.nested.property('body.active_entity.active_entity_recursive', 1);
    });
  });

  describe('getFullSession()', () => {
    it('should return the current full session', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getFullSession')
      .reply(200, fullSession);

      const result = await glpi.getFullSession();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.session.glpiname', 'glpi');
    });
  });
});