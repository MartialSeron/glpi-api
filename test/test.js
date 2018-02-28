const got = require('got');

const expect = require('chai').expect;
const Glpi = require('../glpi');
const config = require('../local');


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
    it('should connect successfully', async () => {
      const glpi = new Glpi(config.userToken);
      try {
        const result = await glpi.initSession();
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body');
        expect(result.body).to.have.property('session_token');
      } catch (err) {
        expect(err).to.not.exist();
      }
      await glpi.killSession();
    });

    it('wrong app_token should not connect successfully', async () => {
      const fakeConfig = Object.assign({}, config.userToken);
      fakeConfig.app_token = 'boggus';
      let res;
      try {
        const glpi = new Glpi(fakeConfig);
        res = await glpi.initSession();
        expect(res).to.not.exist();
      } catch(err) {
        expect(err).to.have.property('statusCode', 400);
        expect(err).to.have.property('statusMessage', 'Bad Request');
      }
    });
  });

  describe('Basic Authorisation method', () => {
    it('should connect successfully', async () => {
      const glpi = new Glpi(config.basicAuth);
      let result;
      try {
        result = await glpi.initSession();
        expect(result).to.have.property('statusCode', 200);
        expect(result).to.have.property('body');
        expect(result.body).to.have.property('session_token');
      } catch (err) {
        expect(err).to.not.exist();
      }
      await glpi.killSession();
    });

    it('wrong password should not connect successfully', async () => {
      const fakeConfig = Object.assign({}, config.basicAuth);
      fakeConfig.auth.password = 'boggus';
      let res;
      try {
        const glpi = new Glpi(fakeConfig);
        res = await glpi.initSession();
        expect(res).to.not.exist();
      } catch(err) {
        expect(err).to.have.property('statusCode', 401);
        expect(err).to.have.property('statusMessage', 'Unauthorized');
      }
    });
  });
})

describe('killSession()', () => {
  it('should log out successfully', async () => {
    const glpi = new Glpi(config.userToken);
    try {
      await glpi.initSession();
      const result = await glpi.killSession();
      expect(result).to.have.property('statusCode', 200);
    } catch (err) {
      expect(err).to.not.exist();
    }
  });

  it('should clear session property after successful log out', async () => {
    const glpi = new Glpi(config.userToken);
    try {
      await glpi.initSession();
      const result = await glpi.killSession();
      expect(glpi._session).to.be.equal('');
    } catch (err) {
      expect(err).to.not.exist();
    }
  });
});

describe('Basic GET methods', () => {
  const glpi = new Glpi(config.userToken);
  before( async () => await glpi.initSession());
  after( async () => await glpi.killSession());

  describe('getMyProfiles()', () => {
    it('should fetch my profiles', async () => {
      const result = await glpi.getMyProfiles();
      expect(result).to.have.property('statusCode', 200);
      expect(result).to.have.property('body');
      expect(result.body).to.have.property('myprofiles');
      expect(result.body.myprofiles).to.be.an('array');
      const sa = result.body.myprofiles.find(p => p.name === 'Super-Admin');
      expect(sa).to.be.an('object');
      expect(sa).to.have.property('id', 4);
    });
  });
});