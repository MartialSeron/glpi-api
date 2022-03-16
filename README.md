# GLPI-API

Node module for [GLPI](https://glpi-project.org/) REST API

[![npm version](https://badge.fury.io/js/glpi-api.svg)](https://badge.fury.io/js/glpi-api)
[![Build Status](https://travis-ci.com/MartialSeron/glpi-api.svg?branch=master)](https://travis-ci.com/MartialSeron/glpi-api)
[![codecov](https://codecov.io/gh/MartialSeron/glpi-api/branch/master/graph/badge.svg)](https://codecov.io/gh/MartialSeron/glpi-api)
![license](https://img.shields.io/badge/license-MIT-orange.svg)
[![Rate this package](https://badges.openbase.com/js/rating/glpi-api.svg?style=openbase&token=XpZR4YwDxshSCxxHIHLyFxTampwwyaL1jxh8vKRshfA=)](https://openbase.com/js/glpi-api?utm_source=embedded&amp;utm_medium=badge&amp;utm_campaign=rate-badge)

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
.then((ret) => {
  const ticket = ret.data;
  // Do what you want with your ticket
})
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

#### Add a requester to a ticket

```javascript
glpi.initSession()
.then(() => glpi.addItems('Ticket_User', {
  users_id : 154,
  tickets_id : 123456,
  type : 1,
}))
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

#### Accept solution (since 9.3)

```javascript
glpi.initSession()
.then(() => glpi.getSubItems('Ticket', 123456, 'ITILSolution'))
.then((ret) => {
  if (!ret.data.length) {
    throw new Error('No solution for this item');
  }
  const { id : solutionId } = ret.data[0]; // the first solution in array is the most recent solution
  return glpi.updateItems('ITILSolution', solutionId, {
    status : 3,
    users_id_approval : 154, // if approver is different than logged user
  });
})
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

#### Close a ticket

```javascript
glpi.initSession()
.then(() => glpi.updateItems('Ticket', 123456, { status : 6 }))
.catch((err) => {
  // Manage error
})
.then(() => glpi.killSession());
```

#### Upload a file and attach it to a ticket

```javascript
const file = path.resolve(__dirname, 'myfile.txt');

glpi.initSession()
.then(() => glpi.upload(file, {
  entities_id : 0,
  is_recursive : true,
  documentcategories_id : 2,
}))
.then((ret) => {
  const { id : documents_id } = ret.data;
  return glpi.addItems('Document_Item', {
    documents_id,
    items_id : 123456,
    itemtype : 'Ticket',
  })
})
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

## Authors

* **Martial Séron** - [MartialSeron](https://github.com/MartialSeron)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

