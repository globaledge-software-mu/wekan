TeamMembersScores = new Mongo.Collection('team_members_scores');

TeamMembersScores.attachSchema(new SimpleSchema({
	userId: {
    type: String,
  },
	cardId: {
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

TeamMembersScores.helpers({
	//
});

TeamMembersScores.allow({
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
