CardScores = new Mongo.Collection('card_scores');

CardScores.attachSchema(new SimpleSchema({
  boardId: {
    type: String
  },
  cardId: {
    type: String
  },
  score: {
    type: String
  },
  type: {
    type: String
  },
  date: {
    type: Date,
    denyUpdate: false,
  },
  userId: {
    type: String,
    autoValue() {
      if (this.isInsert && !this.isSet) {
        return this.userId;
      }
    }
  }
}));

CardScores.allow({
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  update(userId, doc) {
    return userId === doc.userId;
  },
  remove(userId, doc) {
    return userId === doc.userId;
  },
  fetch: ['userId', 'boardId'],
});
