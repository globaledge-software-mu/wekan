Roles = new Mongo.Collection('roles');

Roles.groups = ['boards', 'lists', 'cards'];

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
	  allowedValues: ['boards', 'lists', 'cards'],
  },
  'permissions.$.access': {
	type: String,
	allowedValues: ['fetch', 'insert', 'update'],
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
