const GLPI = require('./glpi');

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
  return glpi.getActiveProfile();
})
.then((res) => {
  const profile = res.body;
  console.log('profile :', profile.active_profile.name);
  return glpi.getMyProfiles();
})
.then((res) => {
  const profiles = res.body;
  console.log('profiles :', profiles);
  const choice = profiles.myprofiles.find((e) => e.name === 'Back Office');

  console.log('choice :', choice);
  return glpi.changeActiveProfile({ profiles_id : choice.id });
})
.then((res) => {
  console.log('res :', res);
  return glpi.getActiveProfile();
})
.then((res) => {
  const profile = res.body;
  console.log('profile :', profile.active_profile.name);
  return glpi.getItem('Ticket', 123456, { get_sha1 : true } );
})
.then((res) => {
  const ticket = res.body;
  console.log('ticket :', ticket);
})
.catch((err) => {
  console.log(err);
})
.then(() => {
  return glpi.killSession();
});
