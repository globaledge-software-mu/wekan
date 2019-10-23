Roles = new Mongo.Collection('roles');

Roles.groups = ['cards', 'lists', 'customization', 'boards', 'templates', 'rules', 'wiplimit', 'users'];
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
    Meteor.methods({
      insertManagerPermissions() {
        return Roles.insert({
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
            { 'group' : 'wiplimit', 'access' : 'update' }, 
            { 'group' : 'users', 'access' : 'fetch' } 
          ]
        });
      },

      insertCoachPermissions() {
        return Roles.insert({
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
            { 'group' : 'wiplimit', 'access' : 'update' }, 
            { 'group' : 'users', 'access' : 'fetch' } 
          ]
        });
      },

      insertCoacheePermissions() {
        return Roles.insert({
          'name' : 'Coachee', 
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
            { 'group' : 'users', 'access' : 'fetch' } 
          ]
        }, {
        	
        });
      },
    });  
  });

  Meteor.startup(() => {
    const roleManager = Roles.findOne({name: 'Manager'});
    if (!roleManager) {
    	Meteor.call('insertManagerPermissions');
    } 
    else if (roleManager && roleManager.permissions.length != 22) {
    	// remove old role doc, 
    	Roles.remove({
    		_id: roleManager._id
  		});
    	// insert new role doc, 
    	var managerRoleId = Meteor.call('insertManagerPermissions');
    	// update users of role 'Manager' with new roleId
  	  var managers = Users.find({ roleId: roleManager._id });
  	  managers.forEach((manager) => {
     	  Users.update(
	  			{ _id: manager._id }, 
	  			{ $set: {
	  				roleId: managerRoleId
	  			} }
			  );
  	  });
    }

    const roleCoach = Roles.findOne({name: 'Coach'});
    if (!roleCoach) {
    	Meteor.call('insertCoachPermissions');
    } 
    else if (roleCoach && roleCoach.permissions.length != 14) {
    	// remove old role doc, 
    	Roles.remove({
    		_id: roleCoach._id
  		});
    	// insert new role doc, 
    	var coachRoleId = Meteor.call('insertCoachPermissions');
    	// update users of role 'Coach' with new roleId
  	  var coaches = Users.find({ roleId: roleCoach._id });
  	  coaches.forEach((coach) => {
     	  Users.update(
	  			{ _id: coach._id }, 
	  			{ $set: {
	  				roleId: coachRoleId
	  			} }
			  );
  	  });
    }

    const roleCoachee = Roles.findOne({name: 'Coachee'});
    if (!roleCoachee) {
    	Meteor.call('insertCoacheePermissions');
    } 
    else if (roleCoachee && roleCoachee.permissions.length != 10) {
    	// remove old role doc, 
    	Roles.remove({
    		_id: roleCoachee._id
  		});
    	// insert new role doc, 
    	var coacheeRoleId = Meteor.call('insertCoacheePermissions');
    	// update users of role 'Coachee' with new roleId
  	  var coachees = Users.find({ roleId: roleCoachee._id });
  	  coachees.forEach((coachee) => {
     	  Users.update(
	  			{ _id: coachee._id }, 
	  			{ $set: {
	  				roleId: coacheeRoleId
	  			} }
			  );
  	  });
    }
  });
}

