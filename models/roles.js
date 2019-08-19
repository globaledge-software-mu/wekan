Roles = new Mongo.Collection('roles');

Roles.groups = ['cards', 'lists', 'customization', 'boards', 'templates', 'rules', 'wiplimit'];
Roles.accessTypes = ['fetch', 'insert', 'update'];

Roles.attachSchema(new SimpleSchema({
  name: {
    type: String,
  },
  createdAt: {
    type: Date,
    denyUpdate: false,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  permissions: {
    type: [Object],
    defaultValue: [],
  },
  'permissions.$.group': {
  	type: String,
	  allowedValues: Roles.groups,
  },
  'permissions.$.access': {
  	type: String,
  	allowedValues: Roles.accessTypes,
  	defaultValue: 'fetch',
  }
}));

Roles.allow({
  insert(userId) {
    const user = Users.findOne(userId);
    return user && Meteor.user().isAdmin;
  },
  update(userId) {
    const user = Users.findOne(userId);
    return user && Meteor.user().isAdmin;
  },
  remove(userId, doc) {
    const user = Users.findOne(userId);
    const roleUsers =  Users.find({ roleId: doc._id }).count();
    return user && Meteor.user().isAdmin && roleUsers == 0;
  },
  fetch: [],
});

Roles.helpers({
  hasPermission(group, access) {
    for (const p of this.permissions) {
      if (p.group == group && p.access == access) {
        return true;
      }
    }
    return false;
  },
});

if (Meteor.isServer) {
  Meteor.startup(() => {
    const manager = Roles.findOne({name: 'Manager'});
    if(!manager){
      Roles.insert({
        'name' : 'Manager', 
        'permissions' : [ 
          { 'group' : 'cards', 'access' : 'fetch' }, 
          { 'group' : 'cards', 'access' : 'insert' }, 
          { 'group' : 'cards', 'access' : 'update' }, 
          { 'group' : 'lists', 'access' : 'fetch' }, 
          { 'group' : 'lists', 'access' : 'insert' }, 
          { 'group' : 'lists', 'access' : 'update' }, 
          { 'group' : 'customization', 'access' : 'fetch' }, 
          { 'group' : 'customization', 'access' : 'insert' }, 
          { 'group' : 'customization', 'access' : 'update' }, 
          { 'group' : 'boards', 'access' : 'fetch' }, 
          { 'group' : 'boards', 'access' : 'insert' }, 
          { 'group' : 'boards', 'access' : 'update' }, 
          { 'group' : 'templates', 'access' : 'fetch' }, 
          { 'group' : 'templates', 'access' : 'insert' }, 
          { 'group' : 'templates', 'access' : 'update' }, 
          { 'group' : 'rules', 'access' : 'fetch' }, 
          { 'group' : 'rules', 'access' : 'insert' }, 
          { 'group' : 'rules', 'access' : 'update' }, 
          { 'group' : 'wiplimit', 'access' : 'fetch' }, 
          { 'group' : 'wiplimit', 'access' : 'insert' }, 
          { 'group' : 'wiplimit', 'access' : 'update' } 
        ]
      });
    }
    const coach = Roles.findOne({name: 'Coach'});
    if(!coach){
      Roles.insert({
        'name' : 'Coach', 
        'permissions' : [ 
          { 'group' : 'cards', 'access' : 'fetch' }, 
          { 'group' : 'cards', 'access' : 'insert' }, 
          { 'group' : 'cards', 'access' : 'update' }, 
          { 'group' : 'lists', 'access' : 'fetch' }, 
          { 'group' : 'lists', 'access' : 'insert' }, 
          { 'group' : 'lists', 'access' : 'update' }, 
          { 'group' : 'boards', 'access' : 'fetch' }, 
          { 'group' : 'boards', 'access' : 'insert' }, 
          { 'group' : 'boards', 'access' : 'update' }, 
          { 'group' : 'templates', 'access' : 'fetch' }, 
          { 'group' : 'wiplimit', 'access' : 'fetch' }, 
          { 'group' : 'wiplimit', 'access' : 'insert' }, 
          { 'group' : 'wiplimit', 'access' : 'update' } 
        ]
      });
    }
    const coachee = Roles.findOne({name: 'Coachee'});
    if(!coachee){
      Roles.insert({
        'name' : 'Coachee', 
        'permissions' : [ 
          { 'group' : 'cards', 'access' : 'fetch' }, 
          { 'group' : 'cards', 'access' : 'insert' }, 
          { 'group' : 'cards', 'access' : 'update' }, 
          { 'group' : 'lists', 'access' : 'fetch' }, 
          { 'group' : 'boards', 'access' : 'fetch' } 
        ]
      });
    }
  });
}

