AspectsListItems = new Mongo.Collection('aspects_list_items');

AspectsListItems.attachSchema(new SimpleSchema({
	aspectsListId: {
    type: String,
  },
	cardId: {
    type: String,
  },
  title: {
    type: String,
  },
  scoreOf: {
    type: String, // current or initial
    optional: true,
  },
  score: {
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

AspectsListItems.helpers({
	//
});


// To run the following block of script only once in dev & staging platforms only
// & remove it after its execution
if (Meteor.isServer) {
  Meteor.startup(() => {

	  const cardsWithTeam = Cards.find({ team_members: { $ne: null } });
    if (cardsWithTeam.count() > 0) {
      cardsWithTeam.forEach((teamedCard) => {
        if (teamedCard.team_members.length > 0) {
          for (var i = 0; i < teamedCard.team_members.length; i++) {
            TeamMembersScores.insert({
              userId: teamedCard.team_members[i],
              cardId: teamedCard._id
            });
          }
        }
      });
    }

  });
}

AspectsListItems.allow({
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
