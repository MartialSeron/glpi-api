const expect = require('chai').expect;
const nock = require('nock');
const _ = require('lodash');
const Glpi = require('../glpi');

const requestTypePhone = require('./requesttype_phone.json');
const myProfiles = require('./myprofiles.json');
const activeProfile = require('./activeprofile.json');
const myEntities = require('./myentities.json');
const activeEntitiesAll = require('./activeentities_all.json');
const fullSession = require('./fullsession.json');
const itemTicketDefault = require('./ticket_default.json');
const itemTicketExpandedDropdowns = require('./ticket_expanded_dropdowns.json');
const itemTicketWithoutHateoas = require('./ticket_without_hateoas.json');
const itemTicketLogDefault = require('./ticket_log_default.json');
const itemTicketTasksDefault = require('./ticket_tasks_default.json');
const itemTickets = require('./tickets.json');
const itemComputerDefault = require('./computer_default.json');
const itemComputerWithDevices = require('./computer_with_devices.json');
const itemMultipleTicketUser = require('./multiple_ticket_user.json');
const searchOptionsTicket = require('./searchoptions_ticket.json');
const searchOptionsTicketRaw = require('./searchoptions_ticket_raw.json');
const searchTicket = require('./search_ticket.json');
const searchTicketNoOpts = require('./search_ticket_no_opts.json');

const genToken = () => Math.random().toString(36).substr(2);
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

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
  describe('With user_token Authorisation method', () => {
    it('should create a Glpi object', () => {
      const glpi = new Glpi(config.userToken);
      expect(glpi).to.be.instanceOf(Glpi);
      expect(glpi).to.have.deep.own.property('_settings', {
        user_token : config.userToken.user_token,
        auth       : undefined,
        app_token  : config.userToken.app_token,
        apiurl     : config.userToken.apiurl,
      });
    });

    it('should throw MissingAuthorizationError (no config object)', () => {
      try {
        const glpi = new Glpi();
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAuthorizationError');
      }
    });

    it('should throw MissingAppTokenError (no App-Token)', () => {
      const fakeConfig = deepClone(config.userToken);
      delete fakeConfig.app_token;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAppTokenError');
      }
    });

    it('should throw MissingAuthorizationError (no user_token)', () => {
      const fakeConfig = deepClone(config.userToken);
      delete fakeConfig.user_token;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAuthorizationError');
      }
    });
  });

  describe('With Basic Authorisation method', () => {
    it('should create a Glpi object ', () => {
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

    it('should throw MissingAppTokenError (no App-Token)', () => {
      const fakeConfig = deepClone(config.basicAuth);
      delete fakeConfig.app_token;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAppTokenError');
      }
    });

    it('should throw MissingAuthorizationError (no auth)', () => {
      const fakeConfig = deepClone(config.basicAuth);
      delete fakeConfig.auth;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAuthorizationError');
      }
    });

    it('should throw MissingAuthorizationError (no username)', () => {
      const fakeConfig = deepClone(config.basicAuth);
      delete fakeConfig.auth.username;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAuthorizationError');
      }
    });

    it('should throw MissingAuthorizationError (no password)', () => {
      const fakeConfig = deepClone(config.basicAuth);
      delete fakeConfig.auth.password;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAuthorizationError');
      }
    });

    it('should throw MissingAPIURLError', () => {
      const fakeConfig = deepClone(config.basicAuth);
      delete fakeConfig.apiurl;
      try {
        const glpi = new Glpi(fakeConfig);
        expect(glpi).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'MissingAPIURLError');
      }
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

      const fakeConfig = deepClone(config.userToken);
      fakeConfig.app_token = 'boggus';

      const expectedBody = [
        'ERROR_APP_TOKEN_PARAMETERS_MISSING',
        `missing parameter app_token; view documentation in your browser at ${fakeConfig.apiurl}/#ERROR_APP_TOKEN_PARAMETERS_MISSING`
      ];

      nock(fakeConfig.apiurl)
      .matchHeader('app-token', fakeConfig.app_token)
      .matchHeader('authorization', `user_token ${fakeConfig.user_token}`)
      .get('/initSession')
      .reply(400, expectedBody, { statusMessage : 'Bad Request'});

      const glpi = new Glpi(fakeConfig);
      glpi.initSession()
      .then((result) => {
        expect(result).to.not.exist();
      })
      .catch((err) => {
        expect(err).to.have.property('statusCode', 400);
        expect(err).to.have.property('statusMessage', 'Bad Request');
        expect(err.response).to.have.nested.property('body[0]', expectedBody[0]);
        expect(err.response).to.have.nested.property('body[1]', expectedBody[1]);
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
      const fakeConfig = deepClone(config.basicAuth);
      fakeConfig.auth.password = 'boggus';

      const expectedBody = [
        'ERROR_GLPI_LOGIN_USER_TOKEN',
        'le paramètre user_token semble incorrect',
      ];

      const base64 = new Buffer(`${fakeConfig.auth.username}:${fakeConfig.auth.password}`).toString('base64');
      nock(fakeConfig.apiurl)
      .matchHeader('app-token', fakeConfig.app_token)
      .matchHeader('authorization', `Basic ${base64}`)
      .get('/initSession')
      .reply(401, expectedBody, { statusMessage : 'Unauthorized' });

      const glpi = new Glpi(fakeConfig);
      glpi.initSession()
      .then((result) => {
        expect(result).to.not.exist();
      })
      .catch((err) => {
        expect(err).to.have.property('statusCode', 401);
        expect(err).to.have.property('statusMessage', 'Unauthorized');
        expect(err.response).to.have.nested.property('body[0]', expectedBody[0]);
        expect(err.response).to.have.nested.property('body[1]', expectedBody[1]);
      })
      .then(done);
    });
  });
});

describe('lostPassword()', () => {
  it('should request a new password successfully', async () => {
    const expectedBody = [
      'Un courriel a été envoyé à votre adresse email. Le courriel contient les informations pour réinitialiser votre mot de passe.',
    ];
    nock(config.userToken.apiurl)
    .put('/lostPassword', { email : 'martial.seron@gmail.com' })
    .reply(200, expectedBody);

    try {
      const glpi = new Glpi(config.userToken);
      const result = await glpi.lostPassword('martial.seron@gmail.com');
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property('body[0]', expectedBody[0]);
    } catch(err) {
      expect(err).to.not.exist();
    }
  });

  it('should return that the email does not exist', () => {
    const expectedBody = [
      'ERROR',
      `L'adresse demandée est inconnue.; Afficher la documentation dans votre navigateur à ${config.userToken.apiurl}/#ERROR`,
    ];
    nock(config.userToken.apiurl)
    .put('/lostPassword', { email : 'unknown@gmail.com' })
    .reply(400, expectedBody, { statusMessage : 'Bad Request' });


    const glpi = new Glpi(config.userToken);
    return glpi.lostPassword('unknown@gmail.com')
    .then(result => expect(result).to.not.exist())
    .catch((err) => {
      expect(err).to.have.property('statusCode', 400);
      expect(err).to.have.property('statusMessage', 'Bad Request');
      expect(err.response).to.have.nested.property('body[0]', expectedBody[0]);
      expect(err.response).to.have.nested.property('body[1]', expectedBody[1]);
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

      const result = await glpi.getMyProfiles();
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
    it('should return all active entities', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getActiveEntities')
      .reply(200, activeEntitiesAll);

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
      })
      .reply(200, itemTicketDefault);

      try {
        const result = await glpi.getItem('Ticket', requestedTicketId);

        console.log(result);
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.nested.property('body.id', requestedTicketId);
        expect(result).to.have.nested.property('body.links[0].rel', 'Entity');
        expect(result).to.have.nested.property('body.links[0].href', `${config.userToken.apiurl}/Entity/3`);
      } catch(err) {
        console.log(err);
        expect(err).to.not.exist();
      }
    });

    it('should return the expected ticket with expanded dropdowns', async () => {
      const requestedTicketId = 123456;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get(`/Ticket/${requestedTicketId}`)
      .query({
        expand_dropdowns  : true,
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
        expand_dropdowns  : false,
        get_hateoas       : false,
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
        expand_dropdowns  : false,
        get_hateoas       : true,
        get_sha1          : true,
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
        expand_dropdowns  : false,
        get_hateoas       : true,
        get_sha1          : false,
        with_devices      : true,
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

  describe('getItems()', () => {
    it('should return 10 tickets ordered by ascending id (no options)', async () => {
      const expectedResult = _.slice(_.orderBy(itemTickets, ['id'], ['asc']), 0, 10);
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/Ticket')
      .query({
        expand_dropdowns  : false,
        get_hateoas       : true,
        only_id           : false,
        range             : '0-50',
        sort              : 'id',
        order             : 'DESC',
        searchText        : '',
        is_deleted        : false,
      })
      .reply(200, expectedResult, { 'Content-Range' : '0-50/250', 'Accept-Range' : 'Ticket 1000' });

      const result = await glpi.getItems('Ticket');

      const rawIds = _.map(result.body, 'id');
      const orderedIds = _.map(_.orderBy(result.body, ['id'], ['asc']), 'id');

      expect(result).to.have.property('statusCode', 200);
      expect(result.headers).to.have.property('content-range', '0-50/250');
      expect(result.headers).to.have.property('accept-range', 'Ticket 1000');
      expect(result.body).to.be.an('array').of.length(10);
      expect(JSON.stringify(rawIds)).to.be.equal(JSON.stringify(orderedIds));
    });

    it('should return 10 tickets ordered by ascending id ', async () => {
      const expectedResult = _.slice(_.orderBy(itemTickets, ['id'], ['asc']), 0, 10);
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/Ticket')
      .query({
        expand_dropdowns  : false,
        get_hateoas       : true,
        only_id           : false,
        range             : '0-10',
        sort              : 'id',
        order             : 'ASC',
        searchText        : '',
        is_deleted        : false,
      })
      .reply(200, expectedResult, { 'Content-Range' : '0-10/250', 'Accept-Range' : 'Ticket 1000' });

      const result = await glpi.getItems('Ticket', {
        range : '0-10',
        sort  : 'id',
        order : 'ASC',
      });

      const rawIds = _.map(result.body, 'id');
      const orderedIds = _.map(_.orderBy(result.body, ['id'], ['asc']), 'id');

      expect(result).to.have.property('statusCode', 200);
      expect(result.headers).to.have.property('content-range', '0-10/250');
      expect(result.headers).to.have.property('accept-range', 'Ticket 1000');
      expect(result.body).to.be.an('array').of.length(10);
      expect(JSON.stringify(rawIds)).to.be.equal(JSON.stringify(orderedIds));
    });

    it('should return tickets 50 to 100 ordered by descending id without HATEOAS', async () => {
      const expectedResult = _.slice(_.orderBy( _.transform(itemTickets, (r, o) => { delete o.links; r.push(o); }, []) , ['id'], ['desc']), 50, 100);
      const nbResultsTotal = itemTickets.length;
      const nbResultsExpected = nbResultsTotal > 50 ? 50 : nbResultsTotal;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/Ticket')
      .query({
        expand_dropdowns  : false,
        get_hateoas       : false,
        only_id           : false,
        range             : '50-100',
        sort              : 'id',
        order             : 'DESC',
        searchText        : '',
        is_deleted        : false,
      })
      .reply(200, expectedResult, { 'Content-Range' : `50-100/${nbResultsTotal}`, 'Accept-Range' : 'Ticket 1000' });

      const result = await glpi.getItems('Ticket', {
        range       : '50-100',
        sort        : 'id',
        order       : 'DESC',
        get_hateoas : false,
      });

      const rawIds = _.map(result.body, 'id');
      const orderedIds = _.map(_.orderBy(result.body, ['id'], ['desc']), 'id');

      expect(result).to.have.property('statusCode', 200);
      expect(result.headers).to.have.property('content-range', `50-100/${nbResultsTotal}`);
      expect(result.headers).to.have.property('accept-range', 'Ticket 1000');
      expect(result.body).to.be.an('array').of.length(nbResultsExpected);
      expect(JSON.stringify(rawIds)).to.be.equal(JSON.stringify(orderedIds));
      expect(result).to.not.have.deep.nested.property('body[0].links');
    });
  });

  describe('getSubItems()', () => {
    describe('With item type as string', () => {
      it('should return logs of requested ticket', async () => {
        const requestedTicketId = 123456;
        const expectedResult = _.slice(_.orderBy(itemTicketLogDefault, ['date_mod'], ['desc']), 0, 5);
        const nbResultsTotal = itemTicketLogDefault.length;
        const nbResultsExpected = nbResultsTotal > 5 ? 5 : nbResultsTotal;
        nock(config.userToken.apiurl)
        .matchHeader('app-token', config.userToken.app_token)
        .matchHeader('session-token', sessionToken)
        .get(`/Ticket/${requestedTicketId}/Log`)
        .query({
          expand_dropdowns : false,
          get_hateoas      : true,
          only_id          : false,
          range            : '0-5',
          sort             : 'date_mod',
          order            : 'DESC',
        })
        .reply(200, expectedResult, { 'Content-Range' : `0-5/${nbResultsTotal}`, 'Accept-Range' : 'Log 1000' });

        const result = await glpi.getSubItems('Ticket', requestedTicketId, 'Log', {
          range : '0-5',
          sort  : 'date_mod',
          order : 'DESC',
        });

        const rawIds = _.map(result.body, 'id');
        const orderedIds = _.map(_.orderBy(result.body, ['date_mod'], ['desc']), 'id');

        expect(result).to.have.property('statusCode', 200);
        expect(result.headers).to.have.property('content-range', `0-5/${nbResultsTotal}`);
        expect(result.headers).to.have.property('accept-range', 'Log 1000');
        expect(result.body).to.be.an('array').of.length(nbResultsExpected);
        expect(JSON.stringify(rawIds)).to.be.equal(JSON.stringify(orderedIds));
      });

      it('should return the user profil', async () => {

      });

      it('should throw MissingItemTypeError without sub item type provided', async () => {
        const requestedTicketId = 123456;
        try {
          const result = await glpi.getSubItems('Ticket', requestedTicketId);
          expect(result).to.not.exist();
        } catch(err) {
          expect(err).to.be.instanceOf(Error).with.property('name', 'MissingItemTypeError');
        }
      });
    });


    describe('With item as object', () => {
      it('should return the requestType of requested ticket', async () => {
        const requestedTicket = deepClone(itemTicketDefault);
        const expectedResult = requestTypePhone;
        nock(config.userToken.apiurl)
        .matchHeader('app-token', config.userToken.app_token)
        .matchHeader('session-token', sessionToken)
        .get(`/RequestType/${requestTypePhone.id}`)
        .query({
          expand_dropdowns : false,
          get_hateoas      : true,
          only_id          : false,
          range            : '0-50',
          sort             : 'id',
          order            : 'DESC',
        })
        .reply(200, expectedResult);

        const result = await glpi.getSubItems(requestedTicket, 'RequestType');
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.nested.property('body.id', requestTypePhone.id);
        expect(result).to.have.nested.property('body.name', requestTypePhone.name);
      });

      it('should return followups of requested ticket', async () => {
        const requestedTicket = deepClone(itemTicketDefault);
        const expectedResult = _.slice(_.orderBy(itemTicketTasksDefault, ['date_mod'], ['desc']), 0, 5);
        const nbResultsTotal = itemTicketTasksDefault.length;
        const nbResultsExpected = nbResultsTotal > 5 ? 5 : nbResultsTotal;
        nock(config.userToken.apiurl)
        .matchHeader('app-token', config.userToken.app_token)
        .matchHeader('session-token', sessionToken)
        .get(`/Ticket/${requestedTicket.id}/TicketTask`)
        .query({
          expand_dropdowns : false,
          get_hateoas      : true,
          only_id          : false,
          range            : '0-5',
          sort             : 'date_mod',
          order            : 'DESC',
        })
        .reply(200, expectedResult, { 'Content-Range' : `0-5/${nbResultsTotal}`, 'Accept-Range' : 'TicketTask 1000' });

        try {
          const result = await glpi.getSubItems(requestedTicket, 'TicketTask', {
            range : '0-5',
            sort  : 'date_mod',
            order : 'DESC',
          });

          const rawIds = _.map(result.body, 'id');
          const orderedIds = _.map(_.orderBy(result.body, ['date_mod'], ['desc']), 'id');

          expect(result).to.have.property('statusCode', 200);
          expect(result.headers).to.have.property('content-range', `0-5/${nbResultsTotal}`);
          expect(result.headers).to.have.property('accept-range', 'TicketTask 1000');
          expect(result.body).to.be.an('array').of.length(nbResultsExpected);
          expect(JSON.stringify(rawIds)).to.be.equal(JSON.stringify(orderedIds));
        } catch(err) {
          expect(err).to.not.exist();
        }

      });

      it('should throw MissingHATEOASError with ticket as object with no links', async () => {
        const requestedTicket = deepClone(itemTicketDefault);
        delete requestedTicket.links;
        try {
          const result = await glpi.getSubItems(requestedTicket, 'Log');
          expect(result).to.not.exist();
        } catch(err) {
          expect(err).to.be.instanceOf(Error).with.property('name', 'MissingHATEOASError');
        }
      });

      it('should throw MissingHATEOASError with ticket as object without requested link', async () => {
        const requestedTicket = itemTicketDefault;

        try {
          const result = await glpi.getSubItems(requestedTicket, 'Log');
          expect(result).to.not.exist();
        } catch(err) {
          expect(err).to.be.instanceOf(Error).with.property('name', 'MissingHATEOASError');
        }
      });

      it('should throw MissingItemTypeError with ticket as object without sub item type', async () => {
        const requestedTicket = itemTicketDefault;
        try {
          const result = await glpi.getSubItems(requestedTicket);
          expect(result).to.not.exist();
        } catch(err) {
          expect(err).to.be.instanceOf(Error).with.property('name', 'MissingItemTypeError');
        }
      });
    });



  });

  describe('getMultipleItems()', () => {
    it('should throw InvalidParameterError', async () => {
      try {
        const result = await glpi.getMultipleItems();
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should return a ticket and a user', async () => {
      const requestedTicketId = 123456;
      const requestedUserId = 135841;
      const requestedItems = [{
        itemtype : 'Ticket',
        items_id : requestedTicketId,
      }, {
        itemtype : 'User',
        items_id : requestedUserId,
      }];
      const expectedResult = itemMultipleTicketUser;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/getMultipleItems')
      .query({
        items             : requestedItems,
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
      })
      .reply(200, expectedResult);

      try {
        const result = await glpi.getMultipleItems({
          items : requestedItems,
        });

        expect(result).to.have.property('statusCode', 200);
        expect(result.body).to.be.an('array').of.length(requestedItems.length);
      } catch(err) {
        expect(err).to.not.exist();
      }
    });
  });

  describe('listSearchOptions()', () => {
    it('should return search options for Ticket (not raw)', async () => {
      const expectedResult = searchOptionsTicket;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/listSearchOptions/Ticket')
      .reply(200, expectedResult);

      const result = await glpi.listSearchOptions('Ticket');

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.a.nested.property('body[1].name', 'Titre');
      expect(result).to.have.a.nested.property('body[1].uid', 'Ticket.name');
      expect(result).to.not.have.a.nested.property('body[1].searchtype', 'contains');
    });


    it('should return search options for Ticket (raw)', async () => {
      const expectedResult = searchOptionsTicketRaw;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/listSearchOptions/Ticket')
      .query({
        raw : true,
      })
      .reply(200, expectedResult);

      const result = await glpi.listSearchOptions('Ticket', true);

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.a.nested.property('body[1].name', 'Titre');
      expect(result).to.have.a.nested.property('body[1].searchtype', 'contains');
      expect(result).to.not.have.a.nested.property('body[1].uid', 'Ticket.name');
    });
  });

  describe('search()', () => {
    it('should return no search result if no criteria', async () => {
      const expectedResult = searchTicketNoOpts;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/search/Ticket')
      .query({
        sort         : 'id',
        order        : 'DESC',
        rawdata      : false,
        withindexes  : false,
        uid_cols     : false,
        giveItems    : false,
      })
      .reply(200, expectedResult);

      const result = await glpi.search('Ticket');

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.a.nested.property('body.totalcount', null);
      expect(result).to.have.a.nested.property('body.count', 0);
    });

    it('should return search result for requested ticket (search by ticket id)', async () => {
      const expectedResult = searchTicket;
      const criteria = [{
        link       : 'AND',
        itemtype   : 'Ticket',
        field      : 23,
        searchtype : 'contains',
        value      : 123456,
      }];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .get('/search/Ticket')
      .query({
        criteria,
        sort         : 'id',
        order        : 'DESC',
        rawdata      : false,
        withindexes  : false,
        uid_cols     : false,
        giveItems    : false,
      })
      .reply(200, expectedResult);

      const result = await glpi.search('Ticket', { criteria });

      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.a.nested.property('body.data[0][2]', 123456);
    });
  });
});

describe('Authenticated POST methods', () => {
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

  describe('changeActiveProfile()', () => {
    it('should change my active profile', async () => {
      const requestedProfile = 9;
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveProfile', { profiles_id : requestedProfile })
      .reply(200);

      try {
        const result = await glpi.changeActiveProfile(requestedProfile);
        expect(result).to.have.property('statusCode', 200);
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should return a 404 error if profile is not valid', () => {
      const requestedProfile = 999;
      const expectedBody = [
        'ERROR_ITEM_NOT_FOUND',
        'Élément introuvable',
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveProfile', { profiles_id : requestedProfile })
      .reply(404, expectedBody, { statusMessage : 'Not Found'});

      return glpi.changeActiveProfile(requestedProfile)
      .then(result => expect(result).to.not.exist())
      .catch((err) => {
        expect(err).to.have.property('statusCode', 404);
        expect(err).to.have.property('statusMessage', 'Not Found');
        expect(err.response).to.have.nested.property('body[0]', expectedBody[0]);
        expect(err.response).to.have.nested.property('body[1]', expectedBody[1]);
      });
    });
  });

  describe('changeActiveEntities()', () => {
    it('should change active entities', async () => {
      const requestedEntity = '1';
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveEntities', { entities_id : requestedEntity, is_recursive : 'false' })
      .reply(200, '"true"');

      try {
        const result = await glpi.changeActiveEntities(requestedEntity);
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body', 'true');
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should select all entities (id = 0)', async () => {
      const requestedEntity = '0';
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveEntities', { entities_id : requestedEntity, is_recursive : 'false' })
      .reply(200, '"true"');

      try {
        const result = await glpi.changeActiveEntities(requestedEntity);
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body', 'true');
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should select all entities (no id)', async () => {
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveEntities', { is_recursive : 'false' })
      .reply(200, '"true"');

      const result = await glpi.changeActiveEntities();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.property('body', 'true');
    });

    it('should return a 400 error if entity is not valid', () => {
      const requestedEntity = '999';
      const expectedBody = [
        'ERROR',
        `Bad Request; Afficher la documentation dans votre navigateur à ${config.userToken.apiurl}/#ERROR`
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/changeActiveEntities', { entities_id : requestedEntity, is_recursive : 'false' })
      .reply(400, expectedBody, { statusMessage : 'Bad Request' });

      return glpi.changeActiveEntities(requestedEntity)
      .then(result => expect(result).to.not.exist())
      .catch((err) => {
        expect(err).to.have.property('statusCode', 400);
        expect(err).to.have.property('statusMessage', 'Bad Request');
        expect(err.response).to.have.nested.property('body[0]', expectedBody[0]);
        expect(err.response).to.have.nested.property('body[1]', expectedBody[1]);
      });
    });
  });

  describe('addItems()', () => {
    it('should throw InvalidItemTypeError', async () => {
      const data = { name : 'Lorem ipsum' };
      try {
        const result = await glpi.addItems('Bogus', data);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidItemTypeError');
      }
    });

    it('should add a Ticket', async () => {
      const data = { name : 'Lorem ipsum' };
      const id = '1802200547';
      const message = `Votre ticket a bien été enregistré, son traitement est en cours. (Ticket : ${id})`;
      const successBody = { id, message };
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/Ticket', { input : data })
      .reply(201, successBody);

      try {
        const result = await glpi.addItems('Ticket', data);
        expect(result).to.have.property('statusCode', 201);
        expect(result).to.have.nested.property('body.id', id);
        expect(result).to.have.nested.property('body.message', message);
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should add 3 Tickets', async () => {
      const data = [{ name : 'Lorem ipsum' }, { name : 'Lorem ipsum' }, { name : 'Lorem ipsum' }];
      const ids = ['1802200547', '1802200548', '1802200549'];
      const successBody = ids.map((id) => {
        const message = `Votre ticket a bien été enregistré, son traitement est en cours. (Ticket : ${id})`;
        return { id, message };
      });
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .post('/Ticket', { input : data })
      .reply(201, successBody);

      try {
        const result = await glpi.addItems('Ticket', data);
        expect(result).to.have.property('statusCode', 201);
        ids.forEach((id, key) => {
          expect(result).to.have.nested.property(`body[${key}].id`, id);
        });
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should throw InvalidParameterError', async () => {
      try {
        const result = await glpi.addItems('Ticket');
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });
  });

  describe('updateItems()', () => {
    it('should throw InvalidItemTypeError', async () => {
      try {
        const result = await glpi.updateItems('Bogus', 1);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidItemTypeError');
      }
    });

    it('should throw InvalidParameterError (no id and no data)', async () => {
      try {
        const result = await glpi.updateItems('Ticket');
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should throw InvalidParameterError (no data)', async () => {
      try {
        const id = '1802200547';
        const result = await glpi.updateItems('Ticket', id);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should throw InvalidParameterError (data object with no id)', async () => {
      try {
        const data = { status : 6 };
        const result = await glpi.updateItems('Ticket', data);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should throw InvalidParameterError (data array of object with no id)', async () => {
      try {
        const data = [
          { 'status' : 6 },
          { 'status' : 3 },
          { 'status' : 4 },
        ];
        const result = await glpi.updateItems('Ticket', data);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should update the status of the Ticket (id in URL)', async () => {
      const data = { status : 6 };
      const id = '1802200547';
      const successBody = { id, message : '' };
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .put(`/Ticket/${id}`, { input : data })
      .reply(200, successBody);

      try {
        const result = await glpi.updateItems('Ticket', id, data);
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.nested.property('body.id', id);
        expect(result).to.have.nested.property('body.message', '');
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should update the status of the Ticket (id in body)', async () => {
      const id = '1802200547';
      const data = { status : 6, id };
      const successBody = { id, message : '' };
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .put('/Ticket', { input : data })
      .reply(200, successBody);

      try {
        const result = await glpi.updateItems('Ticket', data);
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.nested.property('body.id', id);
        expect(result).to.have.nested.property('body.message', '');
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should update the status of 3 Tickets', async () => {
      const data = [
        { 'id': '1802200589', 'status' : 6 },
        { 'id': '1802200588', 'status' : 3 },
        { 'id': '1802200586', 'status' : 4 },
      ];
      const successBody = [
        { '1802200589': true, 'message': '' },
        { '1802200588': true, 'message': '' },
        { '1802200586': true, 'message': '' },
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .put('/Ticket', { input : data })
      .reply(200, successBody);

      try {
        const result = await glpi.updateItems('Ticket', data);
        expect(result).to.have.property('statusCode', 200);
        data.forEach((item, key) => {
          expect(result).to.have.nested.property(`body[${key}][${item.id}]`, true);
        });
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should update the status of 2 Tickets and return an ERROR_GLPI_PARTIAL_UPDATE error', async () => {
      const data = [
        { 'id': '1802200589', 'status' : 6 },
        { 'id': '1802200588', 'status' : 3 },
        { 'id': '1802200', 'status' : 4 },
      ];
      const successBody = [
        'ERROR_GLPI_PARTIAL_UPDATE',
        [
          { '1802200589': true, 'message': '' },
          { '1802200588': true, 'message': '' },
        ]
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .put('/Ticket', { input : data })
      .reply(207, successBody);

      try {
        const result = await glpi.updateItems('Ticket', data);
        expect(result).to.have.property('statusCode', 207);
        expect(result).to.have.nested.property('body[0]', 'ERROR_GLPI_PARTIAL_UPDATE');
        data.forEach((item, key) => {
          if (item.id !== '1802200') {
            expect(result).to.have.nested.property(`body[1][${key}][${item.id}]`, true);
          } else {
            expect(result).to.not.have.nested.property(`body[1][${key}][${item.id}]`, true);
          }
        });
      } catch(err) {
        expect(err).to.not.exist();
      }
    });
  });


  describe('deleteItems()', () => {
    it('should throw InvalidItemTypeError', async () => {
      try {
        const result = await glpi.deleteItems('Bogus', 1);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidItemTypeError');
      }
    });

    it('should throw InvalidParameterError (no id no data)', async () => {
      try {
        const result = await glpi.deleteItems('Ticket');
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should throw InvalidParameterError (data object with no id)', async () => {
      try {
        const data = {};
        const result = await glpi.deleteItems('Ticket', data);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should throw InvalidParameterError (data array of object with no id)', async () => {
      try {
        const data = [
          {},
          {},
          {},
        ];
        const result = await glpi.deleteItems('Ticket', data);
        expect(result).to.not.exist();
      } catch(err) {
        expect(err).to.be.instanceOf(Error).with.property('name', 'InvalidParameterError');
      }
    });

    it('should delete one Ticket (id in URL)', async () => {
      const id = '1802200547';
      const query = {
        force_purge : false,
        history     : true,
      };
      const successBody = [
        {
          [id]: true,
          message: '',
        }
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .delete(`/Ticket/${id}`)
      .query(query)
      .reply(200, successBody);

      const result = await glpi.deleteItems('Ticket', id);
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property(`body[0][${id}]`, true);
      expect(result).to.have.nested.property('body[0].message', '');
    });

    it('should delete one Ticket (id in body)', async () => {
      const id = '1802200547';
      const data = { id };
      const query = {
        force_purge : false,
        history     : true,
      };
      const successBody = [
        {
          [id]: true,
          message: '',
        }
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .delete('/Ticket', { input : data })
      .query(query)
      .reply(200, successBody);

      const result = await glpi.deleteItems('Ticket', data);
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.nested.property(`body[0][${id}]`, true);
      expect(result).to.have.nested.property('body[0].message', '');
    });

    it('should delete 3 Tickets', async () => {
      const data = [
        { 'id': '1802200589' },
        { 'id': '1802200588' },
        { 'id': '1802200586' },
      ];
      const query = {
        force_purge : false,
        history     : true,
      };
      const successBody = [
        { '1802200589': true, 'message': '' },
        { '1802200588': true, 'message': '' },
        { '1802200586': true, 'message': '' },
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .delete('/Ticket', { input : data })
      .query(query)
      .reply(200, successBody);

      try {
        const result = await glpi.deleteItems('Ticket', data);
        expect(result).to.have.property('statusCode', 200);
        data.forEach((item, key) => {
          expect(result).to.have.nested.property(`body[${key}][${item.id}]`, true);
        });
      } catch(err) {
        expect(err).to.not.exist();
      }
    });

    it('should 2 Tickets and return an ERROR_GLPI_PARTIAL_DELETE error', async () => {
      const data = [
        { 'id': '1802200589' },
        { 'id': '1802200588' },
        { 'id': '1802200' },
      ];
      const query = {
        force_purge : false,
        history     : true,
      };
      const successBody = [
        'ERROR_GLPI_PARTIAL_DELETE',
        [
          { '1802200589': true, 'message': '' },
          { '1802200588': true, 'message': '' },
          { '1802200': false, 'message': 'Élément introuvable' },
        ]
      ];
      nock(config.userToken.apiurl)
      .matchHeader('app-token', config.userToken.app_token)
      .matchHeader('session-token', sessionToken)
      .delete('/Ticket', { input : data })
      .query(query)
      .reply(207, successBody);

      const result = await glpi.deleteItems('Ticket', data);
      expect(result).to.have.property('statusCode', 207);
      expect(result).to.have.nested.property('body[0]', 'ERROR_GLPI_PARTIAL_DELETE');
      data.forEach((item, key) => {
        if (item.id !== '1802200') {
          expect(result).to.have.nested.property(`body[1][${key}][${item.id}]`, true);
        } else {
          expect(result).to.have.nested.property(`body[1][${key}][${item.id}]`, false);
        }
      });
    });
  });
});