# GLPI-API

Node module for [GLPI](https://glpi-project.org/) REST API

[![npm version](https://badge.fury.io/js/glpi-api.svg)](https://badge.fury.io/js/glpi-api)
[![Build Status](https://travis-ci.com/MartialSeron/glpi-api.svg?branch=master)](https://travis-ci.com/MartialSeron/glpi-api)
[![codecov](https://codecov.io/gh/MartialSeron/glpi-api/branch/master/graph/badge.svg)](https://codecov.io/gh/MartialSeron/glpi-api)

## Installation

```
$ npm install --save glpi-api
```

## Usage

### Configuration

```javascript
const GlpiApi = require('glpi-api');

// Config with user_token
const config = {
  app_token  : 'AHBIwc4M21Q8yaOzrluxojHJRvHTF6gteAlDBaFW',
  apiurl     : 'https://myglpi.com/apirest.php',
  user_token : 'tt5jyPvv311OzjmrJMNh2Gqgu5ovOOy7saE2fI5ha',
};

// or

// Config with basic auth
const config = {
  app_token : 'AHBIwc4M21Q8yaOzrluxojHJRvHTF6gteAlDBaFW',
  apiurl     : 'https://myglpi.com/apirest.php',
  auth      : {
    username : 'glpi',
    password : 'secret',
  },
};

const glpi = new GlpiApi(config);
```

### Examples

#### Get a ticket

```javascript
glpi.initSession()
.then(() => glpi.getItem('Ticket', 123456))
.then((ticket) => {
  // Do what you want with your ticket
})
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

#### Close a ticket

```javascript
glpi.initSession()
.then(() => glpi.updateItems('Ticket', ticket.id))
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

## Test

Tests are only available for cloned repository

```
$ npm test
```

## Versioning

I use [SemVer](http://semver.org/) for versioning.

## Authors

* **Martial Séron** - *Initial work* - [MartialSeron](https://github.com/MartialSeron)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

