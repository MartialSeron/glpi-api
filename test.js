const GLPI = require('./glpi');
const tunnel = require('tunnel');
const url = require('url');

const settings = {
  app_token  : '04axspmuyojwgxa8cqlzq9bg4osdsliy8vq14th4',
  user_token : '35m6un78cih1rk00w25zvzn0l5vqwi9znv6iibpvt',
  apiurl     : 'http://lin4e30.tlt/glpi91/apirest.php',
  // proxy      : {
  //   host : 'http://proxyweb.chronopost.fr',
  //   port : 3128,
  // },
};

const glpi = new GLPI(settings);

glpi.initSession()
.then((res) => {
  return glpi.getFullSession();
})
.then((fullSession) => {
  console.log('fullSession :', fullSession);
  // return glpi.getItem('Ticket', '1802080001', { get_hateoas : false });
  return glpi.getItems('Ticket');
})
// .then((tickets) => {
//   if (tickets && tickets.length) {
//     const ticket = tickets[0];
//     // return glpi.getSubItems('Ticket', ticket.id, 'TicketTask', { get_hateoas : false });
//     // return glpi.getSubItems(ticket, 'TicketTask', { get_hateoas : false });
//     return glpi.getMultipleItems({ items : [
//       { itemtype : 'Ticket', items_id : '1802080001' },
//       { itemtype : 'Ticket', items_id : '1802200537' },
//     ] });
//   }
// })
// .then((ticketTasks) => {
//   console.log('ticketTasks :', ticketTasks);
//   return glpi.getMultipleItems
// })
.then(() => {
  return glpi.listSearchOptions('Ticket');
})
.then((res) => {
  console.log('res :', res);
})
.catch((err) => {
  console.log(err);
})
.then(() => {
  return glpi.killSession();
});
