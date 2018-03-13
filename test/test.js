const expect = require('chai').expect;
const nock = require('nock');
const _ = require('lodash');
const Glpi = require('../glpi');

const myProfiles = require('./myprofiles.json');
const activeProfile = require('./activeprofile.json');
const myEntities = require('./myentities.json');
const activeEntity = require('./activeentity.json');
const fullSession = require('./fullsession.json');
const itemTicketDefault = require('./ticket_default.json');
const itemTicketExpandedDropdowns = require('./ticket_expanded_dropdowns.json');
const itemTicketWithoutHateoas = require('./ticket_without_hateoas.json');
const itemComputerDefault = require('./computer_default.json');
const itemComputerWithDevices = require('./computer_with_devices.json');

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

  describe('getItem()', () => {
    it('should return the expected ticket with default options', async () => {
      const requestedTicketId = 123456;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Ticket/${requestedTicketId}`)
      .query({
        expand_dropdowns  : 0,
        get_hateoas       : 1,
        get_sha1          : 0,
        with_devices      : 0,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, itemTicketDefault);

      const result = await glpi.getItem('Ticket', requestedTicketId);
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.id', requestedTicketId);
      expect(result).to.have.nested.property('body.links[0].rel', 'Entity');
      expect(result).to.have.nested.property('body.links[0].href', `${config.userToken.apiurl}/Entity/3`);
    });

    it('should return the expected ticket with expanded dropdowns', async () => {
      const requestedTicketId = 123456;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Ticket/${requestedTicketId}`)
      .query({
        expand_dropdowns  : 1,
        get_hateoas       : 1,
        get_sha1          : 0,
        with_devices      : 0,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, itemTicketExpandedDropdowns);

      const result = await glpi.getItem('Ticket', requestedTicketId, { expand_dropdowns : true });
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.id', requestedTicketId);
      expect(result).to.have.nested.property('body.itilcategories_id', 'Test Category');
      expect(result).to.have.nested.property('body.requesttypes_id', 'Phone');
      expect(result).to.have.nested.property('body.users_id_lastupdater', 'glpi');
      expect(result).to.have.nested.property('body.users_id_recipient', 'glpi');
      expect(result).to.have.nested.property('body.entities_id', 'Root entity > Test Entity');
    });

    it('should return the expected ticket without HATEOAS', async () => {
      const requestedTicketId = 123456;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Ticket/${requestedTicketId}`)
      .query({
        expand_dropdowns  : 0,
        get_hateoas       : 0,
        get_sha1          : 0,
        with_devices      : 0,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, itemTicketWithoutHateoas);

      const result = await glpi.getItem('Ticket', requestedTicketId, { get_hateoas : false });
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.id', requestedTicketId);
      expect(result).to.not.have.nested.property('body.links');
    });

    it('should return the SHA1 of the expected ticket', async () => {
      const requestedTicketId = 123456;
      const expectedSha1 = '8ac3900bbcc7752b22500ead42789f6f1f757c7d';
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Ticket/${requestedTicketId}`)
      .query({
        expand_dropdowns  : 0,
        get_hateoas       : 1,
        get_sha1          : 1,
        with_devices      : 0,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, `"${expectedSha1}"` );

      const result = await glpi.getItem('Ticket', requestedTicketId, { get_sha1 : true });

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.property('body', expectedSha1);
    });

    it('should return the expected computer', async () => {
      const requestedComputerId = 11640;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Computer/${requestedComputerId}`)
      .query({
        expand_dropdowns  : 0,
        get_hateoas       : 1,
        get_sha1          : 0,
        with_devices      : 0,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, itemComputerDefault);

      const result = await glpi.getItem('Computer', requestedComputerId);

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.id', requestedComputerId);
    });

    it('should return the expected computer with its devices', async () => {
      const requestedComputerId = 11640;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Computer/${requestedComputerId}`)
      .query({
        expand_dropdowns  : 0,
        get_hateoas       : 1,
        get_sha1          : 0,
        with_devices      : 1,
        with_disks        : 0,
        with_softwares    : 0,
        with_connections  : 0,
        with_networkports : 0,
        with_infocoms     : 0,
        with_contracts    : 0,
        with_documents    : 0,
        with_tickets      : 0,
        with_problems     : 0,
        with_changes      : 0,
        with_notes        : 0,
        with_logs         : 0,
      })
      .reply(200, itemComputerWithDevices);

      const result = await glpi.getItem('Computer', requestedComputerId, { with_devices : true });

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body.id', requestedComputerId);
      expect(result).to.have.nested.property('body._devices.Item_DeviceProcessor.148471.id', 148471);
      expect(result).to.have.nested.property('body._devices.Item_DeviceProcessor.148472.id', 148472);
      expect(result).to.have.nested.property('body._devices.Item_DeviceMemory.205209.id', 205209);
      expect(result).to.have.nested.property('body._devices.Item_DeviceMemory.205210.id', 205210);
    });
  });

});