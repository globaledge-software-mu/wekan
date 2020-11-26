UserGroups = new Mongo.Collection('user_groups');

UserGroups.attachSchema(new SimpleSchema({
  title: {
    type: String,
  },
  usersQuota: {
    type: Number,
  },
  usedUsersQuota: {
    type: Number,
    optional: true,
    defaultValue: 0,
  },
  boardsQuota: {
    type: Number,
  },
  usedBoardsQuota: {
    type: Number,
    optional: true,
    defaultValue: 0,
  },
  logoUrl: {
    /**
     * URL of the logo of the usergroup
     */
    type: String,
    optional: true,
  },
  defaultBoardColor: {
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

UserGroups.mutations({
  setLogoUrl(logoUrl) {
    return {$set: {logoUrl: logoUrl}};
  },
  setBoardColor(color) {
    return {$set: {defaultBoardColor: color}}
  }
});


UserGroups.after.remove((userId, doc) => {
  if (doc && doc._id && doc.logoUrl && doc.logoUrl.length > 0) {
    const logo = Logos.findOne({ 'original.name': (doc.logoUrl.split('/'))[5] });
    if (logo && logo._id) {
      Logos.remove({_id: logo._id});
    }
  }
});
