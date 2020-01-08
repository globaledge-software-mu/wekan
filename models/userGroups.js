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
  category: {
    //	To categorise similar type of user-groups
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
    
    const doc = UserGroups.findOne();
    if (doc && !doc.category) {
    	AssignedUserGroups.remove({});
    	UserGroups.remove({});
    }

    const userGroup = UserGroups.findOne();
    //	if collection 'user_groups' exists but it do not contain any documents
    if (!userGroup) {
    	//Default Trial User Groups
    	UserGroups.insert({category: 'default-admin-trial', quota: 5, 	title: 'Trial - 5 Users', 					resource: 'Users'});
    	UserGroups.insert({category: 'default-admin-trial', quota: 5, 	title: 'Trial - 5 Template Boards', resource: 'Template Boards'});
    	UserGroups.insert({category: 'default-trial', 			quota: 5, 	title: 'Trial - 5 Folders', 				resource: 'Folders'});
    	UserGroups.insert({category: 'default-trial', 			quota: 5, 	title: 'Trial - 5 Subfolders', 			resource: 'Subfolders'});
    	UserGroups.insert({category: 'default-trial', 			quota: 10, 	title: 'Trial - 10 Regular Boards', resource: 'Regular Boards'});
    	UserGroups.insert({category: 'default-trial', 			quota: 25, 	title: 'Trial - 25 Regular Cards', 	resource: 'Regular Cards'});
    	UserGroups.insert({category: 'default-trial', 			quota: 25, 	title: 'Trial - 25 Lists', 					resource: 'Lists'});

    	//Default Premium User Groups
    	UserGroups.insert({category: 'default-admin-premium', quota: -1, title: 'Premium - Unlimited Users', 						resource: 'Users'});
    	UserGroups.insert({category: 'default-admin-premium', quota: -1, title: 'Premium - Unlimited Template Boards', 	resource: 'Template Boards'});
    	UserGroups.insert({category: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Regular Boards', 	resource: 'Regular Boards'});
    	UserGroups.insert({category: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Regular Cards', 		resource: 'Regular Cards'});
    	UserGroups.insert({category: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Folders', 					resource: 'Folders'});
    	UserGroups.insert({category: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Subfolders', 			resource: 'Subfolders'});
    	UserGroups.insert({category: 'default-premium', 			quota: -1, title: 'Premium - Unlimited Lists', 						resource: 'Lists'});
    }
  });
}
