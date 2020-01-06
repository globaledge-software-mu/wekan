UserGroups = new Mongo.Collection('user_groups');

UserGroups.attachSchema(new SimpleSchema({
  title: {
    type: String,
  },
  action: {
    //  Values for action are as follows: create, read, update, delete
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

//	Have 28 default trial user group documents every 4 documents out of which would contain the crud action allowed and the quota (i.e 10 for now) of the following resources & 
//  28 default premium user group documents every 4 documents out of which would contain the crud action allowed and the quota (i.e unlimited for now) of the following resources: 
//  template boards, regular boards, regular cards, users, folders, sub-folders, lists. 
//	Most important: Add the verification of whether the Model UserGroups already exists or not

if (Meteor.isServer) {
  Meteor.startup(() => {
    const groups = UserGroups.find();
    //	if collection 'user_groups' exists but it do not contain any documents
    if (groups && groups.count() < 1) {
    	//Default Trial CRUD Template Boards User Groups
    	UserGroups.insert({title: 'Create 10 Template Boards', action: 'create', quota: 10, resource: 'template boards'});
    	UserGroups.insert({title: 'Read 10 Template Boards',   action: 'read',   quota: 10, resource: 'template boards'});
    	UserGroups.insert({title: 'Update 10 Template Boards', action: 'update', quota: 10, resource: 'template boards'});
    	UserGroups.insert({title: 'Delete 10 Template Boards', action: 'delete', quota: 10, resource: 'template boards'});
    	//Default Trial CRUD Regular Boards User Groups
    	UserGroups.insert({title: 'Create 10 Regular Boards', action: 'create', quota: 10, resource: 'regular boards'});
    	UserGroups.insert({title: 'Read 10 Regular Boards',   action: 'read',   quota: 10, resource: 'regular boards'});
    	UserGroups.insert({title: 'Update 10 Regular Boards', action: 'update', quota: 10, resource: 'regular boards'});
    	UserGroups.insert({title: 'Delete 10 Regular Boards', action: 'delete', quota: 10, resource: 'regular boards'});
    	//Default Trial CRUD Regular Cards User Groups
    	UserGroups.insert({title: 'Create 10 Regular Cards', action: 'create', quota: 10, resource: 'regular cards'});
    	UserGroups.insert({title: 'Read 10 Regular Cards',   action: 'read',   quota: 10, resource: 'regular cards'});
    	UserGroups.insert({title: 'Update 10 Regular Cards', action: 'update', quota: 10, resource: 'regular cards'});
    	UserGroups.insert({title: 'Delete 10 Regular Cards', action: 'delete', quota: 10, resource: 'regular cards'});
    	//Default Trial CRUD Users User Groups
    	UserGroups.insert({title: 'Create 10 Users', action: 'create', quota: 10, resource: 'users'});
    	UserGroups.insert({title: 'Read 10 Users',   action: 'read',   quota: 10, resource: 'users'});
    	UserGroups.insert({title: 'Update 10 Users', action: 'update', quota: 10, resource: 'users'});
    	UserGroups.insert({title: 'Delete 10 Users', action: 'delete', quota: 10, resource: 'users'});
    	//Default Trial CRUD Folders User Groups
    	UserGroups.insert({title: 'Create 10 Folders', action: 'create', quota: 10, resource: 'folders'});
    	UserGroups.insert({title: 'Read 10 Folders',   action: 'read',   quota: 10, resource: 'folders'});
    	UserGroups.insert({title: 'Update 10 Folders', action: 'update', quota: 10, resource: 'folders'});
    	UserGroups.insert({title: 'Delete 10 Folders', action: 'delete', quota: 10, resource: 'folders'});
    	//Default Trial CRUD Subfolders User Groups
    	UserGroups.insert({title: 'Create 10 Subfolders', action: 'create', quota: 10, resource: 'subfolders'});
    	UserGroups.insert({title: 'Read 10 Subfolders',   action: 'read',   quota: 10, resource: 'subfolders'});
    	UserGroups.insert({title: 'Update 10 Subfolders', action: 'update', quota: 10, resource: 'subfolders'});
    	UserGroups.insert({title: 'Delete 10 Subfolders', action: 'delete', quota: 10, resource: 'subfolders'});
    	//Default Trial CRUD Lists User Groups
    	UserGroups.insert({title: 'Create 10 Lists', action: 'create', quota: 10, resource: 'lists'});
    	UserGroups.insert({title: 'Read 10 Lists',   action: 'read',   quota: 10, resource: 'lists'});
    	UserGroups.insert({title: 'Update 10 Lists', action: 'update', quota: 10, resource: 'lists'});
    	UserGroups.insert({title: 'Delete 10 Lists', action: 'delete', quota: 10, resource: 'lists'});

    	//Default Premium CRUD Template Boards User Groups
    	UserGroups.insert({title: 'Create unlimited Template Boards', action: 'create', quota: -1, resource: 'template boards'});
    	UserGroups.insert({title: 'Read unlimited Template Boards',   action: 'read',   quota: -1, resource: 'template boards'});
    	UserGroups.insert({title: 'Update unlimited Template Boards', action: 'update', quota: -1, resource: 'template boards'});
    	UserGroups.insert({title: 'Delete unlimited Template Boards', action: 'delete', quota: -1, resource: 'template boards'});
    	//Default Premium CRUD Regular Boards User Groups
    	UserGroups.insert({title: 'Create unlimited Regular Boards', action: 'create', quota: -1, resource: 'regular boards'});
    	UserGroups.insert({title: 'Read unlimited Regular Boards',   action: 'read',   quota: -1, resource: 'regular boards'});
    	UserGroups.insert({title: 'Update unlimited Regular Boards', action: 'update', quota: -1, resource: 'regular boards'});
    	UserGroups.insert({title: 'Delete unlimited Regular Boards', action: 'delete', quota: -1, resource: 'regular boards'});
    	//Default Premium CRUD Regular Cards User Groups
    	UserGroups.insert({title: 'Create unlimited Regular Cards', action: 'create', quota: -1, resource: 'regular cards'});
    	UserGroups.insert({title: 'Read unlimited Regular Cards',   action: 'read',   quota: -1, resource: 'regular cards'});
    	UserGroups.insert({title: 'Update unlimited Regular Cards', action: 'update', quota: -1, resource: 'regular cards'});
    	UserGroups.insert({title: 'Delete unlimited Regular Cards', action: 'delete', quota: -1, resource: 'regular cards'});
    	//Default Premium CRUD Users User Groups
    	UserGroups.insert({title: 'Create unlimited Users', action: 'create', quota: -1, resource: 'users'});
    	UserGroups.insert({title: 'Read unlimited Users',   action: 'read',   quota: -1, resource: 'users'});
    	UserGroups.insert({title: 'Update unlimited Users', action: 'update', quota: -1, resource: 'users'});
    	UserGroups.insert({title: 'Delete unlimited Users', action: 'delete', quota: -1, resource: 'users'});
    	//Default Premium CRUD Folders User Groups
    	UserGroups.insert({title: 'Create unlimited Folders', action: 'create', quota: -1, resource: 'folders'});
    	UserGroups.insert({title: 'Read unlimited Folders',   action: 'read',   quota: -1, resource: 'folders'});
    	UserGroups.insert({title: 'Update unlimited Folders', action: 'update', quota: -1, resource: 'folders'});
    	UserGroups.insert({title: 'Delete unlimited Folders', action: 'delete', quota: -1, resource: 'folders'});
    	//Default Premium CRUD Subfolders User Groups
    	UserGroups.insert({title: 'Create unlimited Subfolders', action: 'create', quota: -1, resource: 'subfolders'});
    	UserGroups.insert({title: 'Read unlimited Subfolders',   action: 'read',   quota: -1, resource: 'subfolders'});
    	UserGroups.insert({title: 'Update unlimited Subfolders', action: 'update', quota: -1, resource: 'subfolders'});
    	UserGroups.insert({title: 'Delete unlimited Subfolders', action: 'delete', quota: -1, resource: 'subfolders'});
    	//Default Premium CRUD Lists User Groups
    	UserGroups.insert({title: 'Create unlimited Lists', action: 'create', quota: -1, resource: 'lists'});
    	UserGroups.insert({title: 'Read unlimited Lists',   action: 'read',   quota: -1, resource: 'lists'});
    	UserGroups.insert({title: 'Update unlimited Lists', action: 'update', quota: -1, resource: 'lists'});
    	UserGroups.insert({title: 'Delete unlimited Lists', action: 'delete', quota: -1, resource: 'lists'});
    }
  });
}
