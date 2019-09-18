Meteor.publish('lists', function() {
  return Lists.find();
});