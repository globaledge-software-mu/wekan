Meteor.publish('card', (cardId) => {
  check(cardId, String);
  return Cards.find({ _id: cardId });
});

Meteor.publish('cards', function() {
  return Cards.find();
});