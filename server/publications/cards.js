Meteor.publish('card', (cardId) => {
  check(cardId, String);
  return Cards.find({ _id: cardId });
});

Meteor.publish('cards', function() {
  return Cards.find();
});

Meteor.publish('linkedBoardCards', function() {
  return Cards.find({
  	type: 'cardType-linkedBoard',
  });
});

