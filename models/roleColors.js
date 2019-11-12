RoleColors = new Mongo.Collection('role_colors');

RoleColors.attachSchema(new SimpleSchema({
  roleId: {
    type: String,
    optional: true,
  },
  roleName: {
    type: String,
    optional: true,
  },
  userType: {
    type: String,
    optional: true,
  },
  color: {
    type: String,
    defaultValue: 'darkkhaki',
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
}));

RoleColors.allow({
  insert() {
    return Meteor.user().isAdmin;
  },
  update() {
    return Meteor.user().isAdmin;
  },
  remove() {
    return Meteor.user().isAdmin;
  },
  fetch: [],
});

if (Meteor.isServer) {
	Meteor.methods({
	  removeRoleColors() {
	  	// Remove all docs of role_colors 
	  	RoleColors.remove({});
	  },

	  insertRoleColors() {
	  	RoleColors.insert({ userType: 'admin', color: 'maroon' });
	  	RoleColors.insert({ userType: 'regular', color: 'darkkhaki' });

	  	const manager = Roles.findOne({name: "Manager"});
	  	if (manager && manager._id) {
		  	RoleColors.insert({ roleId: manager._id, color: 'darkblue', roleName: 'Manager' });
	  	}
	  	const coach = Roles.findOne({name: "Coach"});
	  	if (coach && coach._id) {
		  	RoleColors.insert({ roleId: coach._id, color: 'orange', roleName: 'Coach' });
	  	}
	  	const coachee = Roles.findOne({name: "Coachee"});
	  	if (coachee && coachee._id) {
		  	RoleColors.insert({ roleId: coachee._id, color: 'limegreen', roleName: 'Coachee' });
	  	}
	  },
	});
}

