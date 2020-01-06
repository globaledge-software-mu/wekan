AssignedUserGroups = new Mongo.Collection('assigned_user_groups');

AssignedUserGroups.attachSchema(new SimpleSchema({
	userId: {
    type: String,
  },
  userGroupId: {
    type: String,
  },
  groupOrder: {
    type: String,
  },
  quota_used: {
    type: Number,
  },
  createdAt: {
    type: Date,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  modifiedAt: {
    type: Date,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isUpdate) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
}));

AssignedUserGroups.helpers({
	//
});

AssignedUserGroups.allow({
  insert() {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
  },
  update() {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
  },
  remove(userId, doc) {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
  },
  fetch: [],
})

if (Meteor.isServer) {
  Meteor.startup(() => {
  	const assignedGroup = AssignedUserGroups.findOne();
  	if (!assignedGroup) {
  		Users.find().forEach((user) => {
  			UserGroups.find({
  				type: 'default-trial'
				}).forEach((userGroup) => {
					AssignedUserGroups.insert({
						userId: user._id,
					  userGroupId: userGroup._id,
					  groupOrder: 'primary',
					  quota_used: 0
					});
				});
  			if (user && user.isAdmin) {
    			UserGroups.find({
    				type: 'admin-default-trial'
  				}).forEach((userGroup) => {
  					AssignedUserGroups.insert({
  						userId: user._id,
  					  userGroupId: userGroup._id,
  					  groupOrder: 'primary',
  					  quota_used: 0
  					});
  				});
  			}
  		});
  	}
  });
}

