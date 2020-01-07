UserGroups = new Mongo.Collection('user_groups');

UserGroups.attachSchema(new SimpleSchema({
  title: {
    type: String,
  },
  quota: {
    //	Quota stands for the number of time the user is allowed to use a resource. 
    type: Number,
  },
  resource: {
    //	resources are the application properties such as the regular boards, template boards, cards, users,   folders, sub-folders and lists. 
    type: String,
  },
  type: {
    //	to determine whether its a default user group
    type: String,
    optional: true,
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

UserGroups.helpers({
	//
});

UserGroups.allow({
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
    const group = UserGroups.findOne();
    if (group && !group.type) {
    	AssignedUserGroups.remove({});
    	UserGroups.remove({});
    } 

    const adminGroup = UserGroups.findOne({type: 'default-admin-trial'});
    if (!adminGroup) {
    	AssignedUserGroups.remove({});
    	UserGroups.remove({});
    }
    
    const resourceOrientedDoc = UserGroups.findOne();
    if (resourceOrientedDoc && resourceOrientedDoc.action) {
    	AssignedUserGroups.remove({});
    	UserGroups.remove({});
    }

    const userGroup = UserGroups.findOne();
    //	if collection 'user_groups' exists but it do not contain any documents
    if (!userGroup) {
    	//Default Trial User Groups
    	UserGroups.insert({type: 'default-admin-trial', quota: 5, 	title: 'Trial - 5 Users', 					resource: 'users'});
    	UserGroups.insert({type: 'default-admin-trial', quota: 5, 	title: 'Trial - 5 Template Boards', resource: 'template boards'});
    	UserGroups.insert({type: 'default-trial', 			quota: 5, 	title: 'Trial - 5 Folders', 				resource: 'folders'});
    	UserGroups.insert({type: 'default-trial', 			quota: 5, 	title: 'Trial - 5 Subfolders', 			resource: 'subfolders'});
    	UserGroups.insert({type: 'default-trial', 			quota: 10, 	title: 'Trial - 10 Regular Boards', resource: 'regular boards'});
    	UserGroups.insert({type: 'default-trial', 			quota: 25, 	title: 'Trial - 25 Regular Cards', 	resource: 'regular cards'});
    	UserGroups.insert({type: 'default-trial', 			quota: 25, 	title: 'Trial - 25 Lists', 					resource: 'lists'});

    	//Default Premium User Groups
    	UserGroups.insert({type: 'default-admin-premium', quota: -1, title: 'Premium - Unlimited Users', 						resource: 'users'});
    	UserGroups.insert({type: 'default-admin-premium', quota: -1, title: 'Premium - Unlimited Template Boards', 	resource: 'template boards'});
    	UserGroups.insert({type: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Regular Boards', 	resource: 'regular boards'});
    	UserGroups.insert({type: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Regular Cards', 		resource: 'regular cards'});
    	UserGroups.insert({type: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Folders', 					resource: 'folders'});
    	UserGroups.insert({type: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Subfolders', 			resource: 'subfolders'});
    	UserGroups.insert({type: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Lists', 						resource: 'lists'});
    }
  });
}
