TeamMembersAspects = new Mongo.Collection('team_members_aspects');

TeamMembersAspects.attachSchema(new SimpleSchema({
	userId: {
    type: String,
  },
	cardId: {
    type: String,
  },
	aspectsId: {
    type: String,
  },
  initialScore: {
    type: Number,
    optional: true,
  },
  currentScore: {
    type: Number,
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

TeamMembersAspects.helpers({
	//
});

TeamMembersAspects.allow({
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
