AssignedUserGroups = new Mongo.Collection('assigned_user_groups');

AssignedUserGroups.attachSchema(new SimpleSchema({
	userId: {
    type: String,
  },
  userGroupId: {
    type: String,
  },
  groupOrder: {
    type: Number,
  },
  groupAdmin: {
    type: String,
    optional: true,
    defaultValue: 'No',
  },
  useCustomDefaultLogo: {
    type: String,
    optional: true,
  },
  useCustomDefaultBoardColor: {
    type: String,
    optional: true,
    defaultValue: 'Yes',
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
    return true;
  },
  update() {
    return true;
  },
  remove() {
    return true;
  },
  fetch: [],
})

