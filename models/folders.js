Folders = new Mongo.Collection('folders');

Folders.attachSchema(new SimpleSchema({
  name: {
    type: String
  },
  level: {
    type: String
  },
  userId: {
    type: String
  },
  parentId: {
    type: String,
    optional: true,
  },
  'contents': {
    type: [Object],
    optional: true,
  },
  'contents.$.boardId': {
    type: String,
    optional: true,
  },
  createdAt: {
    type: Date,
    optional: true,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  updatedAt: {
    type: Date,
    optional: true,
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      } else {
        this.unset();
      }
    },
  }
}));

Folders.allow({
  insert(userId, doc) {
	return userId === doc.userId;
  },
  update(userId, doc) {
    return userId === doc.userId;
  },
  remove(userId, doc) {
    return userId === doc.userId;
  },
  fetch: ['userId'],
})