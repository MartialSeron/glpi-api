require('dotenv').config();

const config = {
  userToken : {
    app_token  : process.env.GLPI_RESTAPI_APP_TOKEN,
    apiurl     : process.env.GLPI_RESTAPI_URL,
    user_token : process.env.GLPI_RESTAPI_USER_TOKEN,
  },
  basicAuth : {
    app_token : process.env.GLPI_RESTAPI_APP_TOKEN,
    apiurl    : process.env.GLPI_RESTAPI_URL,
    auth      : {
      username : process.env.GLPI_RESTAPI_USERNAME,
      password : process.env.GLPI_RESTAPI_PASSWORD,
    },
  },
};

module.exports = config;