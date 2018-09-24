CardScores = new Mongo.Collection('card_scores');

CardScores.attachSchema(new SimpleSchema({
  boardId: {
    type: String
  },
  cardId: {
    type: String
  },
  currentScore: {
    type: Number
  },
  targetScore: {
    type: Number
  },
  currentDate: {
    type: Date,
    denyUpdate: false,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    }
  },
  dueDate: {
    type: Date,
    denyUpdate: false
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
