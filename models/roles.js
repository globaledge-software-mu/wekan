import { check } from 'meteor/check';

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
  Meteor.methods({
    insertManager() {
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

    insertCoach() {
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

    insertCoachee() {
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
      });
    },

    removeOldRole(params) {
      check(params, Object);
    	Roles.remove({ _id: params.oldRoleID });
    },

    updateRoleColor(params) {
      check(params, Object);
    	RoleColors.update(
  			{ roleName: params.roleName }, 
  			{ $set: {
  				roleId: params.newRoleID
  			} }
  		);
    },

    updateUserRoleId(params) {
      check(params, Object);
  	  var specificUsers = Users.find({ 
  	  	roleId: { 
  	  		$exists: true, 
  	  		$eq: params.oldRoleID 
	  		}
	  	});
    	if (specificUsers && specificUsers.count() > 0) {
    		specificUsers.forEach((specificUser) => {
       	  Users.update(
      			{ _id: specificUser._id }, 
      			{ $set: {
      				roleId: params.newRoleID
      			} }
    		  );
    	  });
    	}
    },

    updateUserEmptyRoleIds(params) {
      check(params, Object);
  	  var emptyRoleUsers = Users.find({ 
  	  	roleId: { 
  	  		$exists: true, 
	  		},
	  	});
    	if (emptyRoleUsers && emptyRoleUsers.count() > 0) {
    		const roleName = Roles.findOne({_id: params.newRoleID}).name;
    		emptyRoleUsers.forEach((emptyRoleUser) => {
    			if (roleName == emptyRoleUser.roleName) {
         	  Users.update(
        			{ _id: emptyRoleUser._id }, 
        			{ $set: {
        				roleId: params.newRoleID
        			} }
      		  );
    			}
    	  });
    	}
    },

    insertRole(params) {
      check(params, Object);
    	const newParams = {};
    	newParams['newRoleID'] = Meteor.call(params.insertMethod);
    	newParams['roleName'] = params.roleName;
    	var roleColorsCount = RoleColors.find().count();
    	if (roleColorsCount == 5) {
      	Meteor.call('updateRoleColor', newParams);
    	} else if (roleColorsCount == 0) {
      	Meteor.call('insertRoleColors');
    	} else if (roleColorsCount != 0 && roleColorsCount != 0) {
      	Meteor.call('removeRoleColors');
      	Meteor.call('insertRoleColors');
    	}
    	Meteor.call('updateUserEmptyRoleIds', newParams);
    },

    updateRole(params) {
      check(params, Object);
    	const newParams = {};
    	newParams['oldRoleID'] = params.oldRoleID;
    	Meteor.call('removeOldRole', newParams);
    	newParams['newRoleID'] = Meteor.call(params.insertMethod);
    	newParams['roleName'] = params.roleName;
    	var roleColorsCount = RoleColors.find().count();
    	if (roleColorsCount == 5) {
      	Meteor.call('updateRoleColor', newParams);
    	} else if (roleColorsCount == 0) {
      	Meteor.call('insertRoleColors');
    	} else if (roleColorsCount != 0 && roleColorsCount != 0) {
      	Meteor.call('removeRoleColors');
      	Meteor.call('insertRoleColors');
    	}
    	Meteor.call('updateUserRoleId', newParams);
    },
  });

  Meteor.startup(() => {
  	var roleColorsCount = RoleColors.find().count();
  	
    const oldRoleManagers = Roles.find({name: 'Manager'});
  	const params1 = {};
  	params1['roleName'] = 'Manager';
  	params1['insertMethod'] = 'insertManager';
    if (oldRoleManagers.count() == 0) {
    	Meteor.call('insertRole', params1);
    } 
    else if (oldRoleManagers.count() != 1 || roleColorsCount != 5) {
      const manager = Roles.findOne({name: 'Manager'});
      const oldRoleManagerID = manager._id;
    	params1['oldRoleID'] = oldRoleManagerID;
    	Meteor.call('updateRole', params1);
    }

    const oldRoleCoaches = Roles.find({name: 'Coach'});
  	const params2 = {};
  	params2['roleName'] = 'Coach';
  	params2['insertMethod'] = 'insertCoach';
    if (oldRoleCoaches.count() == 0) {
    	Meteor.call('insertRole', params2);
    } 
    else if (oldRoleCoaches.count() != 1 || roleColorsCount != 5) {
      const coach = Roles.findOne({name: 'Coach'});
      const oldRoleCoachID = coach._id;
    	params2['oldRoleID'] = oldRoleCoachID;
    	Meteor.call('updateRole', params2);
    }

    const oldRoleCoachees = Roles.find({name: 'Coachee'});
  	const params3 = {};
  	params3['roleName'] = 'Coachee';
  	params3['insertMethod'] = 'insertCoachee';
    if (oldRoleCoachees.count() == 0) {
    	Meteor.call('insertRole', params3);
    } 
    else if (oldRoleCoachees.count() != 1 || roleColorsCount != 5) {
      const coachee = Roles.findOne({name: 'Coachee'});
      const oldRoleCoacheeID = coachee._id;
    	params3['oldRoleID'] = oldRoleCoacheeID;
    	Meteor.call('updateRole', params3);
    }
  });
}

