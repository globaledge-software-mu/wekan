Roles = new Mongo.Collection('roles');

Roles.groups = ['cards', 'lists', 'boards', 'templates', 'rules'];
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
    for (let p in this.permissions) {
      if (p.group == group && p.access == access) {
        return true;
      }
    }
    return false;
  },
});
